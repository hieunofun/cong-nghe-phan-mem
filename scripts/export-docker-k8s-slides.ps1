$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$presentationPath = Join-Path $projectRoot 'JobLink_DockerCompose_K8s_Presentation.pptx'
$outputPath = Join-Path $projectRoot 'artifacts\docker-k8s-slides'
New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
$powerpoint = New-Object -ComObject PowerPoint.Application
$presentation = $null
$overflows = @()
try {
    $presentation = $powerpoint.Presentations.Open($presentationPath, $true, $false, $false)
    foreach ($slide in $presentation.Slides) {
        foreach ($shape in $slide.Shapes) {
            if ($shape.HasTextFrame -and $shape.TextFrame.HasText) {
                $available = $shape.Height - $shape.TextFrame2.MarginTop - $shape.TextFrame2.MarginBottom
                $needed = $shape.TextFrame2.TextRange.BoundHeight
                if ($needed -gt ($available + 2)) {
                    $overflows += [pscustomobject]@{
                        Slide = $slide.SlideIndex
                        Shape = $shape.Name
                        Text = $shape.TextFrame2.TextRange.Text
                        Available = [math]::Round($available, 2)
                        Needed = [math]::Round($needed, 2)
                    }
                }
            }
        }
    }
    $presentation.Export($outputPath, 'PNG', 1600, 900)
    $slideCount = $presentation.Slides.Count
    $report = [pscustomobject]@{
        SlideCount = $slideCount
        OverflowCount = $overflows.Count
        Overflows = @($overflows)
    }
    $report | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $projectRoot 'artifacts\docker-k8s-slides-check.json') -Encoding UTF8
    Write-Output "Exported $slideCount slides to $outputPath"
    Write-Output "Overflow count: $($overflows.Count)"
    if ($overflows.Count -gt 0) {
        $overflows | Format-Table Slide, Shape, Available, Needed, Text -Wrap
        throw 'Text overflow found in Docker Compose and K8s PowerPoint.'
    }
} finally {
    if ($presentation) { $presentation.Close() }
    if ($powerpoint.Presentations.Count -eq 0) { $powerpoint.Quit() }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($powerpoint)
}
