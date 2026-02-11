# x402 direct payment demo
Output x402.gif

Set Shell "zsh"
Set FontSize 18
Set Width 900
Set Height 500
Set Theme "Catppuccin Frappe"
Set Padding 30

Hide
Type "export ORTHOGONAL_API_KEY=orth_live_Brzr2RVLqEuKMYspF2zsJfY6Z713sQQ4"
Enter
Type "cd /Users/orth/Documents/orthogonal/cli"
Enter
Type "clear"
Enter
Show

Type "# Get x402 payment URL for agent wallets"
Sleep 1s
Enter
Sleep 500ms

Type "orth api hunter /v2/domain-search --x402"
Sleep 500ms
Enter
Sleep 2s

Type "# Get full payment details"
Sleep 500ms
Enter
Sleep 500ms

Type "orth api hunter /v2/domain-search --x402-full"
Sleep 500ms
Enter
Sleep 4s

Sleep 1s
