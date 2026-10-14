**행성 검색**에서는 이미 알고 있는 행성을 찾거나 새로운 생산 거점이 될 곳을 찾을 수 있습니다. 필터를 변경할 때마다 결과가 즉시 업데이트됩니다.

**이름 또는 ID.** 상단 입력란에 행성 이름이나 고유 ID의 일부(예: 'OT-580' 또는 'Montem')를 입력하세요. 이름 검색도 필터 중 하나로, 필터 패널에서 설정한 모든 조건과 함께 적용됩니다. 이름과 일치하는 행성이 필터 때문에 숨겨진 경우, 결과 위에 그 개수를 알려 주는 안내가 표시됩니다. 이 안내에는 숨겨진 행성을 더 많이 보이게 할 수 있는 변경 방법이 최대 세 가지 제시되며, 각 방법마다 추가로 표시되는 행성 수도 함께 나옵니다. _Show all_ keeps the name and resets every other filter, so you see every planet matching it.

**Materials.** Each group matches _any of_ or _all of_ its materials, and the groups combine with _all groups_ or _any group_. 이를 통해 '(FEO and H2O) or (MAG and O)'와 같은 검색도 할 수 있습니다. 모든 자원에 대해 일일 최소 채굴량을 개/일 단위로 지정할 수 있습니다.

**행성 조건.** 암석형 행성과 가스형 행성 중 원하는 유형을 하나 또는 둘 다 선택하고, 비옥한 행성만 볼지도 지정하세요. 새 검색을 시작하면 기본적으로 암석형 행성만 선택되어 있습니다. 중력, 기압, 온도는 그에 따라 추가로 필요한 건설 자재(MGC, BL, SEA, HSE, INS, TSH)를 통해서만 영향을 미칩니다. 운송해 올 의향이 있는 자재를 체크하세요. 체크하지 않은 자재가 필요한 행성은 숨겨지므로, 아무것도 체크하지 않으면 추가 자재가 필요 없는 행성만 표시됩니다.

**COGC and infrastructure.** _Active COGC program_ keeps planets running one of the ticked programs right now. _Infrastructure_ is a separate filter and stricter: a planet must have every ticked building (LM Local Market, COGC Chamber of Commerce, WAR Warehouse, ADM Administration Center, SHY Shipyard).

**개수와 전체.** 체크하지 않은 옵션 옆의 숫자는 그 옵션을 체크했을 때 표시될 행성 수입니다. The _Any_ button in the header of Planet conditions, Accept extra building materials, Active COGC program and Infrastructure sets that section to the state that hides the fewest planets, and shows how many planets that gives: both surfaces and no fertility requirement, all extra building materials accepted, no COGC program ticked, no infrastructure ticked. 해당 섹션이 이미 그 상태라면 이 옵션은 강조 표시되며 더 이상 클릭할 수 없습니다.

**거리.** 거래소 및/또는 보유한 제국 중 하나에 속한 계획을 선택하세요. 행성은 선택한 모든 대상으로부터 최대 점프 수 이내에 있어야 하며, 선택한 계획마다 별도의 점프 수 열이 표시됩니다. AI1, CI1, IC1, NC1 열은 항상 정렬할 수 있습니다.

**적용 중인 필터와 초기화.** 적용 중인 필터는 모두 결과 위에 칩으로 표시되며, 칩의 ×를 누르면 해당 필터만 제거됩니다. _Reset_ at the top right goes back to the starting filters and the default order. 조건에 맞는 행성이 없으면 최대 세 개의 제안이 표시되며, 각 제안에는 적용 시 나타날 행성 수가 함께 표시됩니다.

**필터 패널.** 큰 화면에서는 패널 상단의 이중 화살표를 눌러 패널을 좁은 레일 형태로 접거나 다시 펼칠 수 있습니다. On small screens the filters open in a drawer with the _Filters_ button; _Show n planets_ at its bottom closes it.

**목록과 매트릭스.** 목록 보기에서는 검색한 자원이 행성의 다른 자원들과 함께 타일 형태로 표시됩니다. 매트릭스 보기에서는 검색 결과에 있는 모든 자원이 각각 별도의 열로 표시됩니다. 검색한 자원이 먼저 나오며, 일일 채굴량이 많을수록 음영이 진하게 표시됩니다.

**Chart.** The Chart plots every result by distance and output: across, the jumps to your _Distance_ picks (the farthest one when you picked several), or to the nearest exchange without a pick; up, the daily extraction of a searched material you choose (fertility when you search no material). Bigger dots are more fertile. The **best trade-off** planets are the ones no other result beats on both: none is closer _and_ richer. They are highlighted, joined by a dashed line, and everything below and right of that line is beaten by one of them. _Colour by COGC_ colours the dots by their active COGC program instead. Hover a dot for its details, click it to pin it for Compare, and double-click it to create a plan. The list beside the chart ranks the same planets by output. Up to 300 results are plotted, the first ones by the current sort.

**Reading the results.** The colour bar on a material tile compares the planet's daily extraction with the highest of that material on any planet: red is below a quarter, then orange, yellow, and green above three quarters. The column with the construction icon lists the extra building materials a planet needs; hover one to see why (e.g. "Low gravity"). _COGC · Infra_ shows the running COGC program and the planet's infrastructure as LM, COGC, WAR, ADM and SHY. A "—" in a jumps column means there is no jump route: hover it to read "Colony Ship Required".

**Sorting.** Click a column header to sort by it, click again to reverse. Shift+click another header to add it as a tiebreaker (the headers show 1, 2, 3), up to four columns: "NC1 jumps, then FEO /day" lists the richest FEO planets at each distance. The _Sort_ menu does the same without a keyboard. Without a sort of your own, the results are ordered by the first searched material (highest first), otherwise by the jumps to the first distance pick, otherwise by name.

**Columns.** The _Columns_ menu hides and shows columns. In the Matrix it also lists every found material with _All_ and _None_ to show or hide them at once. _Reset_ shows everything again.

**Compare.** On larger screens, pin up to four planets with ☆ to compare them side by side in the tray at the bottom. Fertility, the searched materials and the jumps to your distance picks are coloured from best to worst, with the best value in bold. Rows where the planets differ in anything else are tinted blue.

**Saving and sharing.** The address bar always holds the whole search, so _Copy link_ shares it. "+" opens a new plan for that planet in a new tab, so your search stays where it is. _Save search_ stores named searches in this browser; _Manage_ renames, loads or deletes them.
