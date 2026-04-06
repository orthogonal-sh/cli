# Riveter - Structured Web Scraping Demo
Output riveter-demo.gif

Set Shell "zsh"
Set FontSize 18
Set Width 1000
Set Height 550
Set Theme "Catppuccin Frappe"
Set Padding 20
Set Margin 40
Set BorderRadius 10

# Hidden setup
Hide
Type "source /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh 2>/dev/null"
Enter
Type "clear"
Enter
Show

# Step 1: Show Riveter API info
Type "# Riveter: Structured web scraping via Orth"
Sleep 1s
Enter
Sleep 500ms

Type "orth api show riveter"
Sleep 500ms
Enter
Sleep 3s

# Step 2: Scrape a webpage
Type "# Scrape a webpage and extract its text content"
Sleep 1s
Enter
Sleep 500ms

Type `orth api run riveter /v1/scrape --body '{"url": "https://example.com"}'`
Sleep 500ms
Enter
Sleep 4s

# Step 3: Structured data extraction with Run
Type "# Extract structured data from URLs"
Sleep 1s
Enter
Sleep 500ms

Type `orth api run riveter /v1/run --body '{"input": {"urls": ["https://news.ycombinator.com"]}, "output": {"title": {"prompt": "Article title", "contexts": ["urls"], "tools": ["web_scrape"]}, "points": {"prompt": "Number of points", "contexts": ["urls"], "format": "number"}}}'`
Sleep 500ms
Enter
Sleep 5s

# Step 4: Check run status
Type "# Check the status of your run"
Sleep 1s
Enter
Sleep 500ms

Type "orth api run riveter /v1/run_status --query run_key=your-run-key"
Sleep 500ms
Enter
Sleep 3s

Sleep 1.5s
