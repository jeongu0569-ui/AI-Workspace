// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "CodmesApple",
    platforms: [
        .macOS(.v14),
        .iOS(.v17)
    ],
    products: [
        .executable(name: "Codmes", targets: ["AIWorkspace"])
    ],
    targets: [
        .executableTarget(
            name: "AIWorkspace",
            path: "Sources/AIWorkspace"
        )
    ]
)
