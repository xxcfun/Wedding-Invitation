/* 高清封面动效：始终采样同一张完整图片，只连续形变手臂和捧花附近的网格。 */
(() => {
  "use strict";

  // 局部形变区域采用原图归一化坐标：pivot 为旋转支点，center 为影响中心，radius 为椭圆半径。
  const DEFAULT_REGIONS = {
    arm: {
      pivot: [0.702, 0.471],
      center: [0.752, 0.410],
      radius: [0.075, 0.095],
    },
    bouquet: {
      pivot: [0.374, 0.579],
      center: [0.346, 0.552],
      radius: [0.085, 0.103],
    },
  };

  // 顶点着色器负责移动网格顶点；原始纹理坐标保持不变，因此整张高清图片会随网格连续形变。
  const VERTEX_SHADER = `
    attribute vec2 a_position;
    uniform vec2 u_armPivot;
    uniform vec2 u_armCenter;
    uniform vec2 u_armRadius;
    uniform vec2 u_bouquetPivot;
    uniform vec2 u_bouquetCenter;
    uniform vec2 u_bouquetRadius;
    uniform float u_armAngle;
    uniform float u_bouquetAngle;
    uniform float u_aspect;
    varying vec2 v_texcoord;

    vec2 localRotation(vec2 point, vec2 pivot, vec2 center,
                       vec2 radius, float angle) {
      float distance = length((point - center) / radius);
      // 椭圆外完全不动，边缘平滑归零，肩膀和周围画面保持连续。
      float weight = 1.0 - smoothstep(0.40, 1.0, distance);
      vec2 offset = point - pivot;
      offset.x *= u_aspect;
      // 手掌核心使用同一角度刚性轻摆，只有外围连接区域逐渐减小角度。
      float sine = sin(angle * weight);
      float cosine = cos(angle * weight);
      vec2 rotated = vec2(
        offset.x * cosine - offset.y * sine,
        offset.x * sine + offset.y * cosine
      );
      vec2 displacement = rotated - offset;
      displacement.x /= u_aspect;
      return displacement;
    }

    void main() {
      vec2 point = a_position;
      vec2 movement = localRotation(point, u_armPivot, u_armCenter,
                                    u_armRadius, u_armAngle);
      // 花束上缘贴近新娘脸部；额外固定眼睛和额发，只有花束区域参与摆动。
      movement += localRotation(point, u_bouquetPivot, u_bouquetCenter,
                                u_bouquetRadius, u_bouquetAngle)
                  * smoothstep(0.478, 0.505, point.y);
      vec2 moved = point + movement;
      // 输入坐标以图片左上角为原点；纹理坐标始终使用未形变的完整原图。
      v_texcoord = point;
      gl_Position = vec4(moved.x * 2.0 - 1.0, 1.0 - moved.y * 2.0, 0.0, 1.0);
    }
  `;

  // 片元着色器只按纹理坐标取原图颜色，不额外合成手臂贴图或重绘人物。
  const FRAGMENT_SHADER = `
    precision mediump float;
    uniform sampler2D u_image;
    varying vec2 v_texcoord;
    void main() {
      gl_FragColor = texture2D(u_image, v_texcoord);
    }
  `;

  // 校验自定义区域参数；坐标必须落在 0–1 范围，半径必须大于零，返回副本避免改写默认配置。
  const pair = (value, fallback, isRadius = false) =>
    Array.isArray(value) && value.length === 2 &&
    value.every((number) => Number.isFinite(number) &&
      (isRadius ? number > 0 && number <= 1 : number >= 0 && number <= 1))
      ? value.slice()
      : fallback.slice();

  /**
   * image 需事先完成 decode()。regions 使用相对于原图的 0–1 坐标。
   * 初始化失败返回 null；运行时丢失上下文回调 onError，恢复后回调 onReady。
   */
  window.createHeroMotion = (options = {}) => {
    const { canvas, image, regions = {}, onReady, onError } = options;
    const notifyError = (error) => {
      if (typeof onError === "function") onError(error);
    };
    // 纹理和比例优先取图片天然尺寸，避免 CSS 缩放后的尺寸降低实际渲染清晰度。
    const sourceWidth = image?.naturalWidth || image?.width || 0;
    const sourceHeight = image?.naturalHeight || image?.height || 0;
    if (!canvas?.getContext || !sourceWidth || !sourceHeight) {
      notifyError(new Error("高清封面或动效画布尚未就绪"));
      return null;
    }

    // 允许按区域覆盖参数；每个字段分别校验，缺失或无效字段退回默认值。
    const settings = {};
    for (const name of ["arm", "bouquet"]) {
      const original = DEFAULT_REGIONS[name];
      const supplied = regions?.[name] || {};
      settings[name] = {
        pivot: pair(supplied.pivot, original.pivot),
        center: pair(supplied.center, original.center),
        radius: pair(supplied.radius, original.radius, true),
      };
    }

    // 按二维图片变形的需求创建低功耗 WebGL 上下文，不申请深度、模板或保留绘图缓冲。
    let gl;
    try {
      gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: "low-power",
      });
    } catch (error) {
      notifyError(error);
      return null;
    }
    if (!gl) {
      notifyError(new Error("当前浏览器未启用 WebGL"));
      return null;
    }

    // GPU 资源句柄和生命周期状态分开管理；上下文丢失、主动销毁与普通暂停采用不同恢复路径。
    let resources = null;
    let destroyed = false;
    let contextLost = false;
    let failed = false;
    let paused = false;
    let visible = true;
    let frameId = 0;
    let previousTime = 0;
    // 当前进度逐帧追随目标进度；滚动事件只更新目标，渲染层负责平滑过渡。
    let currentProgress = 0;
    let targetProgress = 0;
    let needsDraw = true;
    let resizeObserver = null;
    let intersectionObserver = null;
    // 误差小于阈值即认为收敛，停止请求动画帧，避免静止页面持续消耗 GPU。
    const EPSILON = 0.0002;
    const RADIANS = Math.PI / 180;

    // 取消已预约帧并清空上一帧时间，恢复播放时从新的时间基准开始。
    function stop() {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      previousTime = 0;
    }

    // 正常销毁时显式释放纹理、缓冲区和程序；上下文已经丢失时只清除本地句柄。
    function releaseResources() {
      if (!resources) return;
      if (!gl.isContextLost()) {
        gl.deleteTexture(resources.texture);
        gl.deleteBuffer(resources.vertices);
        gl.deleteBuffer(resources.indices);
        gl.deleteProgram(resources.program);
      }
      resources = null;
    }

    // 编译单个着色器并检查状态，失败时释放对象并把诊断信息交给静图降级路径。
    function compile(type, source) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("无法创建封面动效着色器");
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`封面动效着色器编译失败：${message || "未知错误"}`);
      }
      return shader;
    }

    // 创建并上传整个场景；首次启动与 WebGL 上下文恢复时都调用同一初始化过程。
    function initialize() {
      // 先检查设备纹理尺寸上限，避免上传不被支持的高清图片后仍把空白画布显示出来。
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      if (sourceWidth > maxTextureSize || sourceHeight > maxTextureSize) {
        throw new Error("封面尺寸超过当前设备的纹理上限");
      }

      let vertexShader = null;
      let fragmentShader = null;
      resources = {
        program: gl.createProgram(),
        vertices: gl.createBuffer(),
        indices: gl.createBuffer(),
        texture: gl.createTexture(),
      };
      if (Object.values(resources).some((resource) => !resource)) {
        throw new Error("无法分配封面动效资源");
      }
      try {
        const fragmentPrecision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
        const precision = fragmentPrecision?.precision > 0 ? "highp" : "mediump";
        // 支持时使用高精度纹理坐标，避免高 DPR 手机将高清图量化成低精度采样。
        vertexShader = compile(gl.VERTEX_SHADER,
          VERTEX_SHADER.replace("varying vec2", `varying ${precision} vec2`));
        fragmentShader = compile(gl.FRAGMENT_SHADER,
          FRAGMENT_SHADER.replace("precision mediump float", `precision ${precision} float`)
            .replace("varying vec2", `varying ${precision} vec2`));
        gl.attachShader(resources.program, vertexShader);
        gl.attachShader(resources.program, fragmentShader);
        gl.linkProgram(resources.program);
        if (!gl.getProgramParameter(resources.program, gl.LINK_STATUS)) {
          throw new Error(`封面动效程序链接失败：${gl.getProgramInfoLog(resources.program) || "未知错误"}`);
        }
      // 链接结束后释放着色器对象；程序已保留所需编译结果，不必长期持有中间对象。
      } finally {
        if (vertexShader) gl.deleteShader(vertexShader);
        if (fragmentShader) gl.deleteShader(fragmentShader);
      }

      // 网格只上传一次；每帧仅更新两个角度，在 GPU 上绘制完整高清纹理。
      const divisions = 80;
      // 规则网格每格拆成两个三角形；80 格边长共 6561 个顶点，索引可用 Uint16 保存。
      const positions = new Float32Array((divisions + 1) ** 2 * 2);
      const indices = new Uint16Array(divisions * divisions * 6);
      let positionOffset = 0;
      let indexOffset = 0;
      for (let row = 0; row <= divisions; row++) {
        for (let column = 0; column <= divisions; column++) {
          positions[positionOffset++] = column / divisions;
          positions[positionOffset++] = row / divisions;
          if (row === divisions || column === divisions) continue;
          const start = row * (divisions + 1) + column;
          indices[indexOffset++] = start;
          indices[indexOffset++] = start + 1;
          indices[indexOffset++] = start + divisions + 1;
          indices[indexOffset++] = start + 1;
          indices[indexOffset++] = start + divisions + 2;
          indices[indexOffset++] = start + divisions + 1;
        }
      }

      // 将顶点和索引写入 GPU 静态缓冲区，后续帧只更新角度 uniform。
      gl.useProgram(resources.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, resources.vertices);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, resources.indices);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
      const position = gl.getAttribLocation(resources.program, "a_position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      // 纹理使用边缘钳制和线性过滤，适配非二次幂图片；不生成 mipmap，也不翻转原图像素。
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, resources.texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.uniform1i(gl.getUniformLocation(resources.program, "u_image"), 0);
      gl.uniform1f(gl.getUniformLocation(resources.program, "u_aspect"), sourceWidth / sourceHeight);
      // 把每个区域的中心、支点和半径传入着色器，角度则在 draw 中按滚动进度更新。
      for (const name of ["arm", "bouquet"]) {
        for (const key of ["pivot", "center", "radius"]) {
          const uniform = `u_${name}${key[0].toUpperCase()}${key.slice(1)}`;
          gl.uniform2fv(gl.getUniformLocation(resources.program, uniform), settings[name][key]);
        }
      }
      resources.armAngle = gl.getUniformLocation(resources.program, "u_armAngle");
      resources.bouquetAngle = gl.getUniformLocation(resources.program, "u_bouquetAngle");
      resources.indexCount = indices.length;
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
      const error = gl.getError();
      if (error !== gl.NO_ERROR) throw new Error(`封面纹理初始化失败：${error}`);
    }

    // CSS 尺寸与画布像素尺寸分别处理；仅在实际像素尺寸变化时重设画布。
    function resize() {
      if (destroyed || contextLost || failed) return;
      const rect = canvas.getBoundingClientRect();
      const cssWidth = rect.width || image.clientWidth || sourceWidth;
      const cssHeight = rect.height || image.clientHeight || cssWidth * sourceHeight / sourceWidth;
      // 按实机 DPR 渲染，最高 3 倍；不把纹理放大到超过原图的像素尺寸。
      const ratio = Math.min(window.devicePixelRatio || 1, 3,
        sourceWidth / cssWidth, sourceHeight / cssHeight);
      const width = Math.max(1, Math.round(cssWidth * ratio));
      const height = Math.max(1, Math.round(cssHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        needsDraw = true;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    // 把平滑进度映射成有限幅度的挥手和花束轻摆，整帧使用同一套索引绘制。
    function draw() {
      if (!resources || contextLost || destroyed || failed) return;
      // 所有角度来自平滑后的滚动进度；停止滚动后收敛，不会自行循环播放。
      const progress = currentProgress;
      const armAngle = Math.sin(progress * Math.PI * 5) * 7 * RADIANS;
      const bouquetAngle = Math.sin(progress * Math.PI * 4) * 4 * RADIANS;
      gl.uniform1f(resources.armAngle, armAngle);
      gl.uniform1f(resources.bouquetAngle, bouquetAngle);
      gl.drawElements(gl.TRIANGLES, resources.indexCount, gl.UNSIGNED_SHORT, 0);
      needsDraw = false;
    }

    // 只有页面前台、画布可见且没有暂停或故障时才继续渲染。
    const canRun = () => !destroyed && !failed && !contextLost &&
      !paused && visible && !document.hidden;

    // 同一时刻最多预约一帧；无重绘需求且已追上目标时不创建空转循环。
    function schedule() {
      if (!frameId && canRun() &&
          (needsDraw || Math.abs(targetProgress - currentProgress) > EPSILON)) {
        frameId = requestAnimationFrame(tick);
      }
    }

    // 每帧按实际间隔插值；限制单帧时间和最大步长，避免切回页面或快速滚动时突然跳姿势。
    function tick(time) {
      frameId = 0;
      if (!canRun()) {
        previousTime = 0;
        return;
      }
      const elapsed = previousTime ? Math.min(64, Math.max(1, time - previousTime)) : 1000 / 60;
      previousTime = time;
      const difference = targetProgress - currentProgress;
      if (Math.abs(difference) > EPSILON) {
        // 快速甩动也逐步经过中间姿势，避免一次追赶跨越多个挥手相位。
        const easedStep = difference * (1 - Math.exp(-elapsed / 90));
        const maxStep = elapsed * 0.0008;
        currentProgress += Math.max(-maxStep, Math.min(maxStep, easedStep));
        if (Math.abs(targetProgress - currentProgress) <= EPSILON) {
          currentProgress = targetProgress;
        }
        needsDraw = true;
      }
      try {
        if (needsDraw) draw();
      } catch (error) {
        fail(error);
        return;
      }
      if (Math.abs(targetProgress - currentProgress) > EPSILON) schedule();
      else previousTime = 0;
    }

    // 运行失败后停止调度并释放资源，通知页面撤下画布，露出一直保留的静态封面。
    function fail(error) {
      failed = true;
      stop();
      releaseResources();
      notifyError(error);
    }

    // 尺寸变化和恢复显示共用入口：先更新视口，再根据需要预约绘制。
    function resizeAndSchedule() {
      resize();
      schedule();
    }

    // 切后台立即停帧；回到前台时重新核对尺寸并标记需要重画。
    function visibilityChanged() {
      if (document.hidden) stop();
      else {
        needsDraw = true;
        resizeAndSchedule();
      }
    }

    // 阻止默认丢失处理以允许浏览器恢复上下文；恢复前显示静态封面。
    function contextWasLost(event) {
      event.preventDefault();
      contextLost = true;
      stop();
      // 句柄随上下文失效；保留监听器，设备恢复后重新上传原始高清纹理。
      resources = null;
      notifyError(new Error("封面动效的图形上下文暂时不可用"));
    }

    // 设备恢复图形上下文后，重新创建 GPU 资源并验证首帧成功，再切回动画。
    function contextWasRestored() {
      if (destroyed) return;
      contextLost = false;
      failed = false;
      try {
        initialize();
        resize();
        draw();
        if (gl.getError() !== gl.NO_ERROR) throw new Error("封面动效恢复绘制失败");
        if (typeof onReady === "function") onReady();
        schedule();
      } catch (error) {
        fail(error);
      }
    }

    try {
      initialize();
      resize();
      draw();
      if (gl.getError() !== gl.NO_ERROR) throw new Error("封面动效首次绘制失败");
    } catch (error) {
      releaseResources();
      notifyError(error);
      return null;
    }

    // 在观察器首次异步回调前先判断是否在屏幕内，避免屏外画布无意义启动。
    const initialRect = canvas.getBoundingClientRect();
    visible = initialRect.bottom > 0 && initialRect.top < window.innerHeight &&
      initialRect.right > 0 && initialRect.left < window.innerWidth;
    if (typeof IntersectionObserver === "function") {
      intersectionObserver = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible) {
          needsDraw = true;
          resizeAndSchedule();
        } else stop();
      });
      intersectionObserver.observe(canvas);
    }
    // 监听画布自身尺寸变化，除窗口缩放外也能响应父容器布局变化。
    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(resizeAndSchedule);
      resizeObserver.observe(canvas);
    }
    window.addEventListener("resize", resizeAndSchedule, { passive: true });
    document.addEventListener("visibilitychange", visibilityChanged);
    canvas.addEventListener("webglcontextlost", contextWasLost);
    canvas.addEventListener("webglcontextrestored", contextWasRestored);
    if (typeof onReady === "function") onReady();

    return {
      // 对外仅接受有限数值，并将滚动目标限制在 0–1；调用本身不立即绘制。
      setProgress(value) {
        if (destroyed || !Number.isFinite(value)) return;
        const progress = Math.max(0, Math.min(1, value));
        if (progress === targetProgress) return;
        targetProgress = progress;
        schedule();
      },
      // 暂停保留当前姿态与纹理，恢复时继续追随最近的目标进度。
      setPaused(value) {
        if (destroyed || paused === Boolean(value)) return;
        paused = Boolean(value);
        if (paused) stop();
        else {
          needsDraw = true;
          resizeAndSchedule();
        }
      },
      // 完整销毁入口：取消帧、解除观察器和事件监听，并释放 GPU 资源；重复调用安全。
      destroy() {
        if (destroyed) return;
        destroyed = true;
        stop();
        intersectionObserver?.disconnect();
        resizeObserver?.disconnect();
        window.removeEventListener("resize", resizeAndSchedule);
        document.removeEventListener("visibilitychange", visibilityChanged);
        canvas.removeEventListener("webglcontextlost", contextWasLost);
        canvas.removeEventListener("webglcontextrestored", contextWasRestored);
        releaseResources();
      },
    };
  };
})();
