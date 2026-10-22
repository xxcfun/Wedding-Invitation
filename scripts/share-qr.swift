import AppKit
import CoreImage
import Vision

// 使用系统二维码编码器；内容与 CONFIG.share.link 一致，不绘制装饰性假二维码。
let link = CommandLine.arguments[1]
let destination = URL(fileURLWithPath: CommandLine.arguments[2])
let filter = CIFilter(name: "CIQRCodeGenerator")!
filter.setValue(Data(link.utf8), forKey: "inputMessage")
filter.setValue("M", forKey: "inputCorrectionLevel")
let image = filter.outputImage!
try CIContext().writePNGRepresentation(of: image, to: destination, format: .RGBA8,
                                      colorSpace: CGColorSpaceCreateDeviceRGB())

// 校验最终邀请图卡时使用同一工具解码，确保二维码仍指向当前请柬。
if CommandLine.arguments.count > 3 {
    let request = VNDetectBarcodesRequest()
    request.symbologies = [.qr]
    try VNImageRequestHandler(url: URL(fileURLWithPath: CommandLine.arguments[3])).perform([request])
    guard request.results?.contains(where: { $0.payloadStringValue == link }) == true else {
        fatalError("邀请图卡二维码校验失败")
    }
    print("邀请图卡二维码校验通过：\(link)")
}
