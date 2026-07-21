param (
    [string]$InputPath,
    [string]$OutputPath
)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $doc = $word.Documents.Open($InputPath)
    # 17 = wdFormatPDF
    $doc.SaveAs([ref]$OutputPath, [ref]17)
    $doc.Close()
    Write-Host "CONVERT_SUCCESS"
} catch {
    Write-Error $_.Exception.Message
} finally {
    $word.Quit()
}
