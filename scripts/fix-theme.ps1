# Theme fix script - replaces hardcoded colors with CSS variables
param(
    [string]$TargetDir = "src"
)

$files = @(
    # Auth pages
    "src/app/(auth)/welcome/page.tsx",
    "src/app/(auth)/login/page.tsx",
    "src/app/(auth)/register/page.tsx",
    "src/app/(auth)/forgot-password/page.tsx",
    "src/app/(auth)/reset-password/page.tsx",
    "src/app/(auth)/error.tsx",
    
    # Main pages
    "src/app/(main)/discover/page.tsx",
    "src/app/(main)/matches/page.tsx",
    "src/app/(main)/chat/[id]/page.tsx",
    "src/app/(main)/profile/page.tsx",
    "src/app/(main)/settings/page.tsx",
    "src/app/(main)/settings/privacy/page.tsx",
    "src/app/(main)/safety/page.tsx",
    "src/app/(main)/stories/page.tsx",
    "src/app/(main)/notifications/page.tsx",
    "src/app/(main)/island/page.tsx",
    "src/app/(main)/gifts/page.tsx",
    "src/app/(main)/duels/page.tsx",
    "src/app/(main)/duels/new/page.tsx",
    "src/app/(main)/events/page.tsx",
    "src/app/(main)/events/[id]/page.tsx",
    "src/app/(main)/date-ideas/page.tsx",
    "src/app/(main)/daily-profile/page.tsx",
    "src/app/(main)/quiz/page.tsx",
    "src/app/(main)/verify/page.tsx",
    "src/app/(main)/layout.tsx",
    "src/app/(main)/error.tsx",
    "src/app/(main)/compatibility/[matchId]/page.tsx",
    
    # Static pages
    "src/app/onboarding/page.tsx",
    "src/app/delete-data/page.tsx",
    "src/app/cgu/page.tsx",
    "src/app/privacy/page.tsx",
    "src/app/not-found.tsx",
    "src/app/error.tsx",
    "src/app/offline/page.tsx",
    "src/app/loading.tsx",
    
    # Admin
    "src/app/admin/page.tsx",
    
    # Components  
    "src/components/safety/ConsentDialog.tsx",
    "src/components/safety/SafetyReminder.tsx",
    "src/components/safety/ReportSheet.tsx",
    "src/components/safety/BlockButton.tsx",
    "src/components/chat/MessageBubble.tsx",
    "src/components/chat/OnlineStatus.tsx",
    "src/components/chat/TypingIndicator.tsx",
    "src/components/MatchModal.tsx",
    "src/components/MatchCard.tsx",
    "src/components/ConfirmDialog.tsx",
    "src/components/ToggleSwitch.tsx",
    "src/components/CoachPanel.tsx",
    "src/components/ui/button.tsx",
    "src/components/ui/form.tsx",
    "src/components/Skeleton.tsx",
    "src/components/ErrorBoundary.tsx",
    "src/components/compatibility/ScoreGauge.tsx",
    "src/components/compatibility/CriteriaCard.tsx",
    "src/components/compatibility/Dashboard.tsx",
    "src/components/Lightbox.tsx",
    "src/components/EventForm.tsx",
    "src/components/EventCard.tsx",
    "src/components/StoryCreator.tsx",
    "src/components/StoryReader.tsx",
    "src/components/AuraSphere.tsx",
    "src/components/Toast.tsx",
    "src/components/FocusTrap.tsx",
    "src/components/BottomSheet.tsx"
)

$replacements = @(
    # text-white -> text-theme (most common)
    @{ Pattern = '(?<!"[^"]*)(?<!''[^'']*)text-white(?!-\d)(?![^"''>]*["''])'; Replacement = 'text-theme' }
    # text-black -> text-theme
    @{ Pattern = 'text-black'; Replacement = 'text-theme' }
    # bg-black -> bg-theme (when alone) or bg-black/* patterns
    @{ Pattern = 'bg-black/(\d+)'; Replacement = 'bg-theme/$1' }
    # bg-white -> bg-surface or bg-card
    @{ Pattern = 'bg-white/(\d+)'; Replacement = 'bg-card/$1' }
    # border-white -> border-light
    @{ Pattern = 'border-white/(\d+)'; Replacement = 'border-light/$1' }
    
    # Specific hex colors used in className patterns
    @{ Pattern = 'text-\[#D92D4A\]'; Replacement = 'text-primary' }
    @{ Pattern = 'bg-\[#D92D4A\]'; Replacement = 'bg-primary' }
    @{ Pattern = 'border-\[#D92D4A\]'; Replacement = 'border-primary' }
    
    @{ Pattern = 'text-\[#F5F0EB\]'; Replacement = 'text-theme' }
    @{ Pattern = 'text-\[#9E9488\]'; Replacement = 'text-secondary' }
    @{ Pattern = 'text-\[#A09890\]'; Replacement = 'text-secondary' }
    @{ Pattern = 'text-\[#6B6258\]'; Replacement = 'text-muted' }
    
    @{ Pattern = 'bg-\[#1C1C1E\]'; Replacement = 'bg-surface' }
    @{ Pattern = 'bg-\[#18181A\]'; Replacement = 'bg-surface-secondary' }
    @{ Pattern = 'bg-\[#222225\]'; Replacement = 'bg-hover' }
    @{ Pattern = 'bg-\[#070708\]'; Replacement = 'bg-theme' }
    @{ Pattern = 'bg-\[#0F0F11\]'; Replacement = 'bg-surface' }
    @{ Pattern = 'bg-\[#FAF7F2\]'; Replacement = 'bg-theme' }
    
    @{ Pattern = 'border-\[#2C2A28\]'; Replacement = 'border-theme' }
    @{ Pattern = 'color-\[#D92D4A\]'; Replacement = 'color-primary' }
    @{ Pattern = 'color-\[#9E9488\]'; Replacement = 'color-secondary' }

    # Material Tailwind colors
    @{ Pattern = 'bg-zinc-700'; Replacement = 'bg-surface-secondary' }
    
    # text-[#22C55E] -> text-success
    @{ Pattern = 'text-\[#22C55E\]'; Replacement = 'text-success' }
    @{ Pattern = 'text-\[#34D399\]'; Replacement = 'text-success' }
    @{ Pattern = 'text-\[#F87171\]'; Replacement = 'text-error' }
    @{ Pattern = 'text-\[#FBBF24\]'; Replacement = 'text-warning' }
    @{ Pattern = 'text-\[#60A5FA\]'; Replacement = 'text-info' }
)

foreach ($file in $files) {
    $path = Join-Path $TargetDir $file
    if (-not (Test-Path $path)) {
        Write-Host "Skipping (not found): $file" -ForegroundColor Yellow
        continue
    }
    
    $content = Get-Content $path -Raw
    $original = $content
    
    foreach ($r in $replacements) {
        $content = $content -replace $r.Pattern, $r.Replacement
    }
    
    if ($content -ne $original) {
        Set-Content $path $content -NoNewline
        Write-Host "Fixed: $file" -ForegroundColor Green
    } else {
        Write-Host "No changes: $file" -ForegroundColor Gray
    }
}

Write-Host "`nDone! Files processed." -ForegroundColor Cyan
