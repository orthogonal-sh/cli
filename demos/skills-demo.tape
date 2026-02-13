# Orthogonal Skills Library Demo
# "Give your AI agent superpowers in one command"
Output skills-demo.gif

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

# Search for skills
Type "# Find a skill for web scraping"
Sleep 300ms
Enter
Sleep 500ms
Type "ortho skills search 'web scraping'"
Sleep 400ms
Enter
Sleep 2.5s

# Show skill details
Type "ortho skills show orthogonal/olostep"
Sleep 400ms
Enter
Sleep 2.5s

# Add to agent
Type "# Add it to your agent"
Sleep 300ms
Enter
Sleep 500ms
Type "ortho skills add orthogonal/olostep"
Sleep 400ms
Enter
Sleep 2s

# Done
Type "# ✓ Your agent can now scrape the web!"
Sleep 300ms
Enter
Sleep 2s
