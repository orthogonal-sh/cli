# VHS demo for Orthogonal CLI
# Run: vhs demo.tape

Output demo.gif

Set Shell "zsh"
Set FontSize 16
Set Width 1000
Set Height 600
Set Theme "Catppuccin Mocha"
Set Padding 20
Set Margin 20
Set MarginFill "#1e1e2e"
Set BorderRadius 10

# Setup
Hide
Type "export ORTHOGONAL_API_KEY=orth_live_Brzr2RVLqEuKMYspF2zsJfY6Z713sQQ4"
Enter
Type "cd /Users/orth/Documents/orthogonal/cli"
Enter
Type "clear"
Enter
Show

# Title
Type "# Orthogonal CLI - Access 100+ APIs from your terminal"
Sleep 1.5s
Enter
Sleep 500ms

# Search for APIs
Type "orth search 'email finder'"
Sleep 500ms
Enter
Sleep 3s

# Show API details
Type "orth api hunter"
Sleep 500ms
Enter
Sleep 2.5s

# Show endpoint details
Type "orth api hunter /v2/domain-search"
Sleep 500ms
Enter
Sleep 2.5s

# Run an API call
Type "orth run hunter /v2/domain-search -q domain=stripe.com -q limit=3"
Sleep 500ms
Enter
Sleep 5s

# Another search
Type "orth search 'web scraping'"
Sleep 500ms
Enter
Sleep 3s

# Show help
Type "orth --help"
Sleep 500ms
Enter
Sleep 2s

# End
Type "# Get started: npm install -g orthogonal-cli"
Sleep 2s
