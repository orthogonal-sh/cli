# Orthogonal CLI Demo
# "100+ APIs, one CLI"
Output cli-demo.gif

Set Shell "zsh"
Set FontSize 18
Set Width 1000
Set Height 550
Set Theme "Catppuccin Frappe"
Set Padding 20
Set BorderRadius 10

# Setup
Hide
Type "source /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"
Enter
Type "export ORTHOGONAL_API_KEY=orth_live_demo"
Enter
Type "clear"
Enter
Show

# Search for APIs
Type "# Search 100+ APIs with natural language"
Sleep 300ms
Enter
Sleep 500ms
Type "orth search 'find email addresses'"
Sleep 400ms
Enter
Sleep 3s

# Show API details
Type "orth api show hunter"
Sleep 400ms
Enter
Sleep 2.5s

# Run an API
Type "# Call any API instantly"
Sleep 300ms
Enter
Sleep 500ms
Type "orth run hunter /v2/domain-search -q domain=stripe.com"
Sleep 400ms
Enter
Sleep 4s

# Generate code
Type "# Generate integration code"
Sleep 300ms
Enter
Sleep 500ms
Type "orth code hunter /v2/domain-search --lang typescript"
Sleep 400ms
Enter
Sleep 3s

Sleep 1s
