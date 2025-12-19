# PowerShell script to convert component HTML files to gallery layout with slide-out drawer
# This script updates all component files that still use the old <div class="section"> pattern

$componentsDir = "c:\Users\Owner\AntigravityProjects\lightview\docs\components"

# List of files to update (exclude already updated ones and special files)
$filesToUpdate = @(
    "breadcrumbs", "chart-area", "chart-bar", "chart-column", "chart-line", "chart-pie", "chart",
    "chat", "checkbox", "collapse", "countdown", "diff", "divider", "dock", "drawer", "dropdown",
    "file-input", "footer", "gallery", "hero", "indicator", "input", "join", "kbd", "loading",
    "menu", "modal", "navbar", "pagination", "progress", "radial-progress", "radio", "range",
    "rating", "select", "skeleton", "stats", "steps", "swap", "table", "tabs", "textarea",
    "theme-controller", "timeline", "toast", "toggle", "tooltip"
)

foreach ($fileName in $filesToUpdate) {
    $filePath = Join-Path $componentsDir "$fileName.html"
    
    if (!(Test-Path $filePath)) {
        Write-Host "Skipping $fileName.html - file not found" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Processing $fileName.html..." -ForegroundColor Cyan
    
    $content = Get-Content $filePath -Raw
    
    # Extract the component name (capitalized version of filename)
    $componentName = (Get-Culture).TextInfo.ToTitleCase($fileName.Replace("-", " "))
    
    # Pattern 1: Replace old section opening
    $oldSectionPattern = '(?s)<div class="section">\s*<div class="section-content"[^>]*>\s*<!-- Breadcrumbs -->.*?<\/script>\s*<h1>.*?<\/h1>\s*<p class="text-lg"[^>]*>.*?<\/p>'
    
    if ($content -match $oldSectionPattern) {
        # Extract the description paragraph
        if ($content -match '<p class="text-lg"[^>]*>(.*?)<\/p>') {
            $description = $Matches[1].Trim()
        } else {
            $description = "Component description"
        }
        
        $newSectionOpening = @"
<!-- Gallery Structure -->
<div class="gallery-page">
    <div class="gallery-layout">
        <!-- Sidebar Overlay -->
        <div id="sidebar-overlay" class="sidebar-overlay"></div>

        <!-- Sidebar -->
        <div id="gallery-sidebar" class="gallery-sidebar" style="visibility: hidden" src="./component-nav.html"></div>

        <!-- Main Content -->
        <div id="gallery-main" class="gallery-main">
            <!-- Header Container -->
            <div
                style="position: sticky; top: 0; z-index: 30; background: var(--gallery-surface); border-bottom: 1px solid var(--gallery-border); backdrop-filter: blur(8px);">
                <!-- Breadcrumbs Row -->
                <div style="padding: 0.75rem 1.5rem 0;">
                    <script>
                        (() => {
                            const { Breadcrumbs } = Lightview.tags;
                            const breadcrumbs = Breadcrumbs({
                                id: 'page-breadcrumbs',
                                items: [
                                    { label: 'Components', href: '/docs/components' },
                                    { label: '$componentName' }
                                ]
                            });
                            document.currentScript.replaceWith(breadcrumbs.domEl);
                        })();
                    </script>
                </div>
                <!-- Title Row -->
                <div class="gallery-header"
                    style="border-bottom: none; height: auto; padding-top: 0.5rem; padding-bottom: 0.75rem;">
                    <button id="toggle-btn" class="toggle-btn" aria-label="Toggle Sidebar">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="toggle-icon"
                            style="stroke: currentColor; stroke-width: 2;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 class="gallery-title">$componentName</h1>
                </div>
            </div>

            <!-- Content -->
            <div class="gallery-content">
                <div class="section-content" style="max-width: 1000px;">
                    <p class="text-lg" style="opacity: 0.7; margin-bottom: 1.5rem;">
                        $description
                    </p>
"@
        
        $content = $content -replace $oldSectionPattern, $newSectionOpening
    }
    
    # Pattern 2: Replace old section closing
    # Look for closing tags near the end with 2-3 line breaks
    $oldClosingPattern = '(?s)\s*</div>\s*\r?\n\s*\r?\n\s*\r?\n\s*</div>\s*\r?\n</div>\s*$'
    $newClosing = @"
                </div>
            </div>
        </div>
    </div>
</div>
"@
    
    $content = $content -replace $oldClosingPattern, $newClosing
    
    # Save the updated content
    $content | Set-Content -Path $filePath -NoNewline
    
    Write-Host "✓ Updated $fileName.html" -ForegroundColor Green
}

Write-Host "`nConversion complete!" -ForegroundColor Green
Write-Host "Total files processed: $($filesToUpdate.Count)" -ForegroundColor Cyan
