Add-Type -AssemblyName System.Drawing

function New-VibeWalletIcon {
  param(
    [int]$Size,
    [string]$OutputPath
  )

  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None

  $background = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#080808'))
  $red = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#f3342f'))
  $paper = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#f5f2eb'))

  $graphics.FillRectangle($background, 0, 0, $Size, $Size)
  $graphics.FillRectangle($red, [int]($Size * 0.121), [int]($Size * 0.121), [int]($Size * 0.758), [int]($Size * 0.758))
  $graphics.FillRectangle($paper, [int]($Size * 0.203), [int]($Size * 0.203), [int]($Size * 0.594), [int]($Size * 0.594))

  $points = @(
    (New-Object System.Drawing.PointF(($Size * 0.285), ($Size * 0.293))),
    (New-Object System.Drawing.PointF(($Size * 0.410), ($Size * 0.293))),
    (New-Object System.Drawing.PointF(($Size * 0.500), ($Size * 0.578))),
    (New-Object System.Drawing.PointF(($Size * 0.590), ($Size * 0.293))),
    (New-Object System.Drawing.PointF(($Size * 0.715), ($Size * 0.293))),
    (New-Object System.Drawing.PointF(($Size * 0.563), ($Size * 0.707))),
    (New-Object System.Drawing.PointF(($Size * 0.438), ($Size * 0.707)))
  )
  $graphics.FillPolygon($background, $points)
  $graphics.FillRectangle($red, [int]($Size * 0.453), [int]($Size * 0.645), [int]($Size * 0.094), [int]($Size * 0.094))

  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $background.Dispose()
  $red.Dispose()
  $paper.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$iconsPath = Join-Path $PSScriptRoot '..\icons'
New-VibeWalletIcon -Size 192 -OutputPath (Join-Path $iconsPath 'icon-192.png')
New-VibeWalletIcon -Size 512 -OutputPath (Join-Path $iconsPath 'icon-512.png')
New-VibeWalletIcon -Size 180 -OutputPath (Join-Path $iconsPath 'apple-touch-icon.png')
