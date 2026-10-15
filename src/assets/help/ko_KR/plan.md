**개요**

개요는 계획 분석의 핵심입니다.  여기에서는 투입 자재와 인력 소모품의 일일 비용, 그리고 생산 건물의 일일 열화 비용을 확인할 수 있습니다.  계획의 초기 건설 비용(코어 모듈을 포함)도 여기에 포함되며, 이후 기지의 ROI(투자 회수 기간)을 계산하는 데 사용됩니다.  일일 수익은 매일 생산되는 산출물의 가치에서 일일 비용을 차감하여 계산됩니다.  마지막으로 면적당 수익은 기지의 일일 수익을 해당 기지에서 사용한 면적으로 나눈 값입니다; 중요한 점은, 계획 개요의 면적당 수익은 실제 기지 면적을 분모로 사용한다는 것입니다. 반면 아래에서 설명하는 제조법의 면적당 수익은 비교 목적을 위해 표준화된 분모를 사용합니다.

- 개요 개산에는 코어 모듈 건설 비용이 포함됩니다.

**생산 건물**

계획에 추가된 각 건물은 이 섹션에 표시됩니다.  사용자는 오른쪽 상단의 +레시피 버튼을 눌러 레시피를 추가할 수 있습니다.  레시피를 선택하면 해당 레시피가 계획 전체에 반영되어, 상단의 개요와 오른쪽의 자재 입출력에 집계됩니다.

제조법을 선택할 때, 해당 건물에서 사용할 수 있는 제조법들이 드롭다운으로 표시됩니다.  각 제조법에는 투입 자재, 소요 시간, 산출물이 표시됩니다.  일일 수익(ȼ/일), 면적당 수익(ȼ/면적), 건물 건설 비용에 대한 ROI(투자 회수 기간)도 자동으로 계산되어 표시됩니다.

- 일일 수익은 계획에 설정된 CX 기준으로 생산물을 판매해 얻는 금액에서 투입 재료비, 인력 비용, 감가상각비를 뺀 순이익입니다. 인력 비용은 계획에 설정된 거주 시절과 사치품을 따릅니다. 거주 시설이 없는 인력이나 사치품을 끈 경우에는 비용이 발생하지 않습니다.
- 면적당 수익은 해당 일일 수익을 생산 건물의 면적과, 건물의 “최적” 배치에서 필요한 HAB 및 STO의 비례 면적으로 나눈 값입니다 (제조법 ROI 도구에서도 사용되는 기준입니다).  이 값은 서로 다른 건물의 제조법 수익성을 일관된 기준으로 비교할 수 있도록 제공됩니다.
- 투자 회수 기간은 해당 생산 건물의 건설 비용을 그 건물의 일일 수익으로 나눈 값입니다.

**저장 및 실행 취소**

구성에서 계획 이름을 저장한 뒤, 저장/생성 버튼이나 Ctrl+S(Mac에서는 Cmd+S)로 저장하세요. 저장 버튼에는 계획의 상태가 표시됩니다. 저장할 내용이 없으면 '저장됨'(마우스를 올리면 마지막 저장 시각 확인 가능), 저장하지 않은 변경 사항이 있으면 점, 저장 중에는 '저장 중...', 저장에 실패하면 '다시 저장'이 표시됩니다. 저장에 성공할 때까지 변경 사항은 유지됩니다.

모든 변경 사항은 저장 버튼 옆의 실행 취소 및 다시 실행 버튼이나 Ctrl+Z, Ctrl+Shift+Z(Mac에서는 Cmd)로 되돌리거나 다시 적용할 수 있습니다. 건물이나 레시피를 삭제하거나 레시피를 변경하면 몇 초 동안 실행 취소 버튼이 포함된 메시지도 표시됩니다. 변경 기록은 최근 50개까지 저장되며, 계획을 저장하거나 다시 불러오면 초기화됩니다.

**Plan check**

Plan check tests a plan against the market. It has three views: Market check (the default), Price sensitivity and Compare plans.

**Market check**

A plan's profit assumes every material can be bought and sold at its price, in any amount. The Market check shows where that isn't true.

- **Share of daily volume**: what the plan buys or sells per day, divided by the average daily volume traded on the exchange in the last 30 days. Selling 50 units a day into a market that trades 100 a day is a 50 % share.
- **Bid, ask and spread**: the bid is the best price a buyer offers right now, the ask the best price a seller asks. Buying at once means paying the ask, selling at once means taking the bid. The spread is the gap between them, as a % of the ask.
- **At real prices**: the plan's profit when every material is bought at the ask and sold at the bid on its exchange. A material without an ask or bid, or without an exchange in your CX preference, keeps its plan price.
- **Exchange**: the exchange of your CX preference. Without one, the check uses the volume of all exchanges together.

**What the flags mean**

- Red, a filled circle: the plan can't trade this material as planned.
  - _No price_: the plan has no price for it and counts it at 0.
  - _No trades in 7 days_: nobody traded it on the exchange in the last 7 days.
  - _No offers_ / _No buyers_: nobody sells (when you buy) or bids for it (when you sell) on the exchange right now.
  - _Bigger than the market_: the plan trades 50 % or more of the daily volume.
- Amber, a triangle: _Large share of the market_, 10 % or more of the daily volume. Your orders will likely move the price.
- Grey, a ring: a note. _All exchanges, no exchange set_ (no CX preference, so all exchanges are counted) or _Data older than 2 days_.

Spreads are shown but never flagged.

**What CX volume misses**

The volume comes from the commodity exchanges only. Sales on local markets, contracts between players and trades inside a corporation aren't counted, so a material can be easier to sell than its CX volume says.

**Empire**

The empire's Material I/O checks the empire's net flow: what one plan makes and another uses nets out, and only the rest reaches the market. Click a flag chip above the table to show only those materials.

**Target price**

In Price sensitivity, Target price finds the price of one material that gives the profit you want, with every other price unchanged. It also shows the exchange's lowest and highest price of the last 30 days.

**Payback of the difference**

In Compare plans: the other plan's extra build cost divided by its extra profit per day, in days. "never" means it costs more and earns no more.
