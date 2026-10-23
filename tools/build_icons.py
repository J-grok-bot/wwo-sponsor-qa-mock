# Builds assets/icons.js from Lucide (ISC license) SVGs. Run: python3 tools/build_icons.py /path/to/lucide-static/icons
import sys, re, json, os
names = "upload mail inbox file-text building-2 calendar-clock calendar-days copy ticket-x tag link spell-check whole-word ban shield-check workflow bot send play circle-check circle-x loader-circle file-up clipboard-paste sparkles circle-alert triangle-alert arrow-right git-merge list-checks rotate-ccw info radio paperclip zap layers scan-text badge-check users file-spreadsheet clock x mic user log-in log-out lock history folder hard-drive pencil lock-open archive file-json chevron-right image scan-line file check signature octagon-x list layout-dashboard eye truck file-spreadsheet user-check pen-line circle-dot globe refresh-cw download printer cloud-upload file-check arrow-left ticket-percent undo-2 check-check wand-sparkles plus trash-2 party-popper message-square-warning file-image lightbulb calendar-check external-link users-round map-pin".split()
out = {}
for n in names:
    s = open(os.path.join(sys.argv[1], n + ".svg")).read()
    out[n] = re.search(r"<svg[^>]*>(.*)</svg>", s, re.S).group(1).strip().replace("\n", "")
open("assets/icons.js", "w").write("// Lucide icons (ISC License, https://lucide.dev) - one flat, minimal line set used everywhere.\nwindow.ICONS = " + json.dumps(out, indent=0) + ";\n")
