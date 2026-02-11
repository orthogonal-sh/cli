# VHS demo for Orthogonal CLI (simple version)
# Run: vhs demo-simple.tape

Output demo-simple.gif

Set Shell "zsh"
Set FontSize 18
Set Width 900
Set Height 500
Set Theme "Dracula"
Set Padding 30

# Setup
Hide
Type "export ORTHOGONAL_API_KEY=orth_live_Brzr2RVLqEuKMYspF2zsJfY6Z713sQQ4"
Enter
Type "cd /Users/orth/Documents/orthogonal/cli"
Enter
Type "clear"
Enter
Show

# Search for APIs
Type "orth search 'email finder'"
Sleep 500ms
Enter
Sleep 2.5s

# Run an API call
Type "orth run hunter /v2/domain-search -q domain=stripe.com -q limit=2"
Sleep 500ms
Enter
Sleep 4s

# End
Sleep 1s
