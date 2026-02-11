# Olostep web scraping demo
Output olostep.gif

Set Shell "zsh"
Set FontSize 18
Set Width 900
Set Height 500
Set Theme "Catppuccin Frappe"
Set Padding 20
Set Margin 20
Set MarginFill "#232634"
Set BorderRadius 10

Hide
Type "export ORTHOGONAL_API_KEY=orth_live_Brzr2RVLqEuKMYspF2zsJfY6Z713sQQ4"
Enter
Type "cd /Users/orth/Documents/orthogonal/cli"
Enter
Type "clear"
Enter
Show

Type "# Scrape any webpage to markdown"
Sleep 1s
Enter
Sleep 500ms

Type `orth run olostep /v1/scrapes --body '{"url": "https://example.com", "formats": ["markdown"]}'`
Sleep 500ms
Enter
Sleep 5s

Sleep 1s
