概览

概览是规划分析的核心。它会提供输入物资和劳动力消耗品的每日成本，以及生产建筑的每日损耗。规划也会计入初始建筑成本（包括核心建筑），其后续会用于计算基地的 ROI（回本周期）。每日利润通过从每日产出价值中扣除每日成本计算得出。最后，单位区域利润是基地每日利润除以基地实际占用区域得出的数值。需要注意的是，它以实际基地面积作为分母；而建筑配方的单位区域利润（下文会进一步说明）则使用标准化分母，便于比较。

- 概览计算包含建造核心模块的成本

**生产建筑**

添加到规划中的每个建筑都会显示在此部分。添加到规划中的每个建筑都会显示在此部分。用户应使用左上角的 + 生产模板 按钮添加生产模板。选择后，那份生产模板会影响整份规划并参与到顶部的概览以及右侧的物料输入/输出的计算当中。

选择配方时，会出现该建筑可用配方的下拉列表。每个配方都会显示输入、运行时间和输出。系统还会自动计算并显示该建筑建造成本对应的每日利润（ȼ / 天）、单位面积利润（ȼ / 面积）以及 ROI（回本周期）。

- 每日利润是按计划的 CX 设置出售产出后，扣除输入物资、劳动力和折旧成本后的净利润。 Workforce costs follow the plan's habitats and luxuries: workers without housing and luxuries turned off cost nothing.
- 单位区域利润是将每日利润除以生产建筑所占区域，以及该建筑在“最优”布局中按比例分摊的必要 HAB 和 STO 区域后得到的数值（该布局用于配方 ROI 工具）。这样可以在不同建筑之间，用一致的标准比较配方盈利能力。
- ROI 是该生产建筑的建造成本除以该建筑每日利润后得到的回本周期。

**保存与撤销**

在配置中命名你的规划并使用 创建/保存 按钮或者 Ctrl+S（Mac系统为 Cmd+S）快捷键保存规划。保存按钮会显示规划的状态：“已保存”代表没有待保存的更改（鼠标悬停可显示上次保存时间），存在未保存的更改是则显示一个圆点，保存规划时显示“保存中…”，“重试保存”则代表保存失败。在保存成功前你的修改内容均会保留。

每处修改均可以使用保存按钮旁边的“撤销”和“重做”按钮撤回，或者使用Ctrl+Z和Ctrl+Shift+Z（Mac系统为Cmd键）。移除一栋建筑或一份生产模板，又或者更改一份生产模板，则会短暂显示一条带有撤销按钮的消息。此记录涵盖最后50次更改，在保存或重新加载规划后重置。

**Plan check**

Plan check tests a plan against the market. It has three views: Market check (the default), Price sensitivity and Compare plans.

选择配方时，会出现该建筑可用配方的下拉列表。每个配方都会显示输入、运行时间和输出。系统还会自动计算并显示该建筑建造成本对应的每日利润（ȼ / 天）、单位面积利润（ȼ / 面积）以及 ROI（回本周期）。

A plan's profit assumes every material can be bought and sold at its price, in any amount. The Market check shows where that isn't true.

- **Share of daily volume**: what the plan buys or sells per day, divided by the average daily volume traded on the exchange in the last 30 days. 概览是规划分析的核心。它会提供输入物资和劳动力消耗品的每日成本，以及生产建筑的每日损耗。规划也会计入初始建筑成本（包括核心建筑），其后续会用于计算基地的 ROI（回本周期）。每日利润通过从每日产出价值中扣除每日成本计算得出。最后，单位区域利润是基地每日利润除以基地实际占用区域得出的数值。需要注意的是，它以实际基地面积作为分母；而建筑配方的单位区域利润（下文会进一步说明）则使用标准化分母，便于比较。
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

概览是规划分析的核心。它会提供输入物资和劳动力消耗品的每日成本，以及生产建筑的每日损耗。规划也会计入初始建筑成本（包括核心建筑），其后续会用于计算基地的 ROI（回本周期）。每日利润通过从每日产出价值中扣除每日成本计算得出。最后，单位区域利润是基地每日利润除以基地实际占用区域得出的数值。需要注意的是，它以实际基地面积作为分母；而建筑配方的单位区域利润（下文会进一步说明）则使用标准化分母，便于比较。

In Price sensitivity, Target price finds the price of one material that gives the profit you want, with every other price unchanged. It also shows the exchange's lowest and highest price of the last 30 days.

每日利润是按规划的交易所偏好设置出售产品后，扣除输入物资、劳动力和折旧成本后的净利润。

In Compare plans: the other plan's extra build cost divided by its extra profit per day, in days. "never" means it costs more and earns no more.
