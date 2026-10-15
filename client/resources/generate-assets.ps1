Add-Type -AssemblyName System.Drawing

# Brand palette (navy -> teal gradient, matches the Northbate LM reference logo)
$navy = [System.Drawing.Color]::FromArgb(255, 17, 41, 64)      # #112940
$teal = [System.Drawing.Color]::FromArgb(255, 34, 197, 180)    # #22C5B4
$white = [System.Drawing.Color]::White

$outDir = $PSScriptRoot

function New-Canvas($size, [bool]$transparent, [System.Drawing.Color]$fill) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    if ($transparent) { $g.Clear([System.Drawing.Color]::Transparent) } else { $g.Clear($fill) }
    return @{ Bitmap = $bmp; Graphics = $g }
}

# Maps a 0-100 local coordinate (y down) onto a canvas region [originX,originY]..[originX+size,originY+size]
function P($x, $y, $originX, $originY, $size) {
    return New-Object System.Drawing.PointF(($originX + ($x / 100.0) * $size), ($originY + ($y / 100.0) * $size))
}

# Draws the "N" that resolves into an upward growth arrow.
function Draw-Mark($g, $originX, $originY, $size, [System.Drawing.Brush]$strokeBrush, [System.Drawing.Brush]$fillBrush) {
    $strokeWidth = $size * 0.135
    $pen = New-Object System.Drawing.Pen($strokeBrush, $strokeWidth)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $leftTop = P 24 20 $originX $originY $size
    $leftBottom = P 24 82 $originX $originY $size
    $diagEnd = P 76 82 $originX $originY $size
    $shaftEnd = P 92 16 $originX $originY $size

    $g.DrawLine($pen, $leftTop, $leftBottom)
    $g.DrawLine($pen, $leftTop, $diagEnd)
    $g.DrawLine($pen, $diagEnd, $shaftEnd)

    # Arrowhead at the tip of the shaft
    $tip = P 98 3 $originX $originY $size
    $wingA = P 105 25 $originX $originY $size
    $wingB = P 81 17 $originX $originY $size
    $head = @($tip, $wingA, $wingB)
    $g.FillPolygon($fillBrush, $head)

    $pen.Dispose()
}

function Gradient($originX, $originY, $size, [System.Drawing.Color]$c1, [System.Drawing.Color]$c2) {
    $rect = New-Object System.Drawing.RectangleF($originX, $originY, $size, $size)
    return New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 55)
}

# ---------------------------------------------------------------------------
# 1) icon-background.png — flat navy->teal gradient square (1024x1024)
# ---------------------------------------------------------------------------
$size = 1024
$r = New-Canvas $size $false $navy
$bg = Gradient 0 0 $size $navy $teal
$r.Graphics.FillRectangle($bg, 0, 0, $size, $size)
$bg.Dispose()
$r.Graphics.Dispose()
$r.Bitmap.Save("$outDir\icon-background.png", [System.Drawing.Imaging.ImageFormat]::Png)
$r.Bitmap.Dispose()

# ---------------------------------------------------------------------------
# 2) icon-foreground.png — transparent, white mark within the adaptive-icon
#    safe zone (centered ~66% of the canvas)
# ---------------------------------------------------------------------------
$r = New-Canvas $size $true $navy
$whiteBrush = New-Object System.Drawing.SolidBrush($white)
$markSize = $size * 0.52
$origin = ($size - $markSize) / 2
Draw-Mark $r.Graphics $origin $origin $markSize $whiteBrush $whiteBrush
$whiteBrush.Dispose()
$r.Graphics.Dispose()
$r.Bitmap.Save("$outDir\icon-foreground.png", [System.Drawing.Imaging.ImageFormat]::Png)
$r.Bitmap.Dispose()

# ---------------------------------------------------------------------------
# 3) icon.png — flattened legacy/Play Store icon (gradient bg + white mark)
# ---------------------------------------------------------------------------
$r = New-Canvas $size $false $navy
$bg = Gradient 0 0 $size $navy $teal
$r.Graphics.FillRectangle($bg, 0, 0, $size, $size)
$bg.Dispose()
$whiteBrush = New-Object System.Drawing.SolidBrush($white)
$markSize = $size * 0.62
$origin = ($size - $markSize) / 2
Draw-Mark $r.Graphics $origin $origin $markSize $whiteBrush $whiteBrush
$whiteBrush.Dispose()
$r.Graphics.Dispose()
$r.Bitmap.Save("$outDir\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$r.Bitmap.Dispose()

# ---------------------------------------------------------------------------
# 4) splash.png — white background, gradient mark + "NORTHBATE" / "LM"
#    wordmark lockup + tagline, matching the reference card
# ---------------------------------------------------------------------------
$splashSize = 2732
$r = New-Canvas $splashSize $false $white

$markSize = $splashSize * 0.26
$markOriginX = ($splashSize - $markSize) / 2
$markOriginY = $splashSize * 0.20
$markBrush = Gradient $markOriginX $markOriginY $markSize $navy $teal
Draw-Mark $r.Graphics $markOriginX $markOriginY $markSize $markBrush $markBrush
$markBrush.Dispose()

$navyBrush = New-Object System.Drawing.SolidBrush($navy)
$tealBrush = New-Object System.Drawing.SolidBrush($teal)

$titleFont = New-Object System.Drawing.Font("Segoe UI", 130, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fmtCenter = New-Object System.Drawing.StringFormat
$fmtCenter.Alignment = [System.Drawing.StringAlignment]::Center
$fmtCenter.LineAlignment = [System.Drawing.StringAlignment]::Center

$titleY = $markOriginY + $markSize + 170
$titleRect = New-Object System.Drawing.RectangleF(0, $titleY, $splashSize, 170)
$r.Graphics.DrawString("NORTHBATE", $titleFont, $navyBrush, $titleRect, $fmtCenter)

$lmFont = New-Object System.Drawing.Font("Segoe UI", 90, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$lmText = "LM"
$lmSizeMeasured = $r.Graphics.MeasureString($lmText, $lmFont)
$lmY = $titleY + 190
$lmRect = New-Object System.Drawing.RectangleF(0, $lmY, $splashSize, 130)
$r.Graphics.DrawString($lmText, $lmFont, $navyBrush, $lmRect, $fmtCenter)

$linePen = New-Object System.Drawing.Pen($teal, 5)
$lmCenterY = $lmY + 65
$lmHalfWidth = ($lmSizeMeasured.Width / 2) + 40
$lineLen = 260
$r.Graphics.DrawLine($linePen, ($splashSize / 2 - $lmHalfWidth - $lineLen), $lmCenterY, ($splashSize / 2 - $lmHalfWidth), $lmCenterY)
$r.Graphics.DrawLine($linePen, ($splashSize / 2 + $lmHalfWidth), $lmCenterY, ($splashSize / 2 + $lmHalfWidth + $lineLen), $lmCenterY)
$linePen.Dispose()

$tagFont = New-Object System.Drawing.Font("Segoe UI", 46, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$tagline = "L O A N   M A N A G E M E N T   S E R V I C E S"
$tagY = $lmY + 230
$tagRect = New-Object System.Drawing.RectangleF(0, $tagY, $splashSize, 100)
$r.Graphics.DrawString($tagline, $tagFont, $tealBrush, $tagRect, $fmtCenter)

$titleFont.Dispose(); $lmFont.Dispose(); $tagFont.Dispose()
$navyBrush.Dispose(); $tealBrush.Dispose()
$r.Graphics.Dispose()
$r.Bitmap.Save("$outDir\splash.png", [System.Drawing.Imaging.ImageFormat]::Png)
$r.Bitmap.Dispose()

Write-Output "Generated icon-background.png, icon-foreground.png, icon.png, splash.png in $outDir"
