import AppKit
import CoreImage
import Vision

// 使用系统二维码编码器；内容与 CONFIG.share.link 一致，不绘制装饰性假二维码。
// 调用参数顺序：请柬链接、二维码输出路径、可选的最终邀请卡路径；由 Node 素材脚本传入。
let link = CommandLine.arguments[1]
let destination = URL(fileURLWithPath: CommandLine.arguments[2])
let filter = CIFilter(name: "CIQRCodeGenerator")!
filter.setValue(Data(link.utf8), forKey: "inputMessage")
// 采用 M 级纠错，在二维码密度与缩放后可识别性之间保持适中的冗余。
filter.setValue("M", forKey: "inputCorrectionLevel")
let image = filter.outputImage!
// 先输出原始二维码 PNG；邀请卡模板以像素化缩放方式嵌入，保持码元边缘清晰。
try CIContext().writePNGRepresentation(of: image, to: destination, format: .RGBA8,
                                      colorSpace: CGColorSpaceCreateDeviceRGB())

// 校验最终邀请图卡时使用同一工具解码，确保二维码仍指向当前请柬。
if CommandLine.arguments.count > 3 {
    let request = VNDetectBarcodesRequest()
    // 仅识别 QR 类型，并核对实际解码内容；识别到其他链接也视为失败。
    request.symbologies = [.qr]
    try VNImageRequestHandler(url: URL(fileURLWithPath: CommandLine.arguments[3])).perform([request])
    guard request.results?.contains(where: { $0.payloadStringValue == link }) == true else {
        fatalError("邀请图卡二维码校验失败")
    }
    print("邀请图卡二维码校验通过：\(link)")
}
