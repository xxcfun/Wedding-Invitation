<?php
// Copy to config.php ON THE SERVER, outside the public/ document root.
// Never commit the real config.php or put it inside public/.
// 仅为配置格式示例。部署时在服务器复制为 config.php，PHP 接口从 public 的同级 private 目录读取。
return [
    // 公众号身份标识，会随签名结果返回前端，必须与签名时使用的 AppSecret 配对。
    'app_id' => 'REPLACE_WITH_YOUR_APP_ID',
    // 公众号服务端密钥；实际值只填在服务器私有配置中，不提交仓库或传给网页。
    'app_secret' => 'REPLACE_WITH_YOUR_APP_SECRET',
];
