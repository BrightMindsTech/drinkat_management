# Physical iPhone acceptance checklist

**Status: BLOCKED** — no physical iPhone was available in this completion pass. Desktop / responsive emulation is **not** iOS acceptance.

Do not mark this checklist passed until a real device on `com.bmtechs.drinkat` completes every row.

| # | Check | Pass? |
| --- | --- | --- |
| 1 | Install / TestFlight / Xcode run uses bundle `com.bmtechs.drinkat` | |
| 2 | Native User-Agent is `DrinkatHR-Native` | |
| 3 | Login (EN) | |
| 4 | Login (AR) + RTL chrome | |
| 5 | Navigation, safe areas, 390 / 375 / SE-class widths | |
| 6 | My Tasks Today: open task Start; completed Preview | |
| 7 | Guided inspection: camera `capture=environment` writes to `/api/upload` → R2 | |
| 8 | Photo visible on the field after upload | |
| 9 | Submit creates issues for fail answers | |
| 10 | Issue after-photo upload | |
| 11 | Push notification received for issue / reminder | |
| 12 | Background → foreground session still valid | |
| 13 | AI photo suggestion shows; human confirm required; no mocked banner | |
| 14 | Voice EN + AR (whisper) after confirm | |
| 15 | SOP assistant shows unavailable (until approved docs exist) | |
| 16 | KPI shadow copy; no official scores | |
| 17 | Offline / bad network error is readable | |
| 18 | App Store / TestFlight metadata reviewed | |

iOS identifiers must stay `com.bmtechs.drinkat` and `DrinkatHR-Native`.
