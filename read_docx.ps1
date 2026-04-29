Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("C:\Users\dayoo\IdeaProjects\PatrioticTH\patriotic-virtual-prod\NVIDIA_PVT_Website_Developer_Brief.docx")
$entry = $zip.GetEntry("word/document.xml")
if ($null -eq $entry) { Write-Output "Could not find word/document.xml"; exit 1 }
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xml = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()
$xml = $xml -replace '<w:p\b[^>]*>', "`n"
$cleanText = $xml -replace '<[^>]+>', ''
$cleanText | Out-File -FilePath "C:\Users\dayoo\IdeaProjects\PatrioticTH\patriotic-virtual-prod\docx_output_utf8.txt" -Encoding utf8
