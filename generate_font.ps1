
try {
    $fontPath = "p:\Bill Splitter\4\public\fonts\Amiri-Regular.ttf"
    $outputPath = "p:\Bill Splitter\4\src\utils\AmiriFont.js"
    
    Write-Host "Reading font from: $fontPath"
    $bytes = [IO.File]::ReadAllBytes($fontPath)
    
    Write-Host "Converting to Base64..."
    $b64 = [Convert]::ToBase64String($bytes)
    
    $content = 'export const amiriFontBase64 = "' + $b64 + '";'
    
    Write-Host "Writing to: $outputPath"
    [IO.File]::WriteAllText($outputPath, $content)
    
    Write-Host "Success!"
} catch {
    Write-Error $_
    exit 1
}
