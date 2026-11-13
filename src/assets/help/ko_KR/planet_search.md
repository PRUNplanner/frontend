**행성 검색**에서는 이미 알고 있는 행성을 찾거나 새로운 생산 거점이 될 곳을 찾을 수 있습니다. 필터를 변경할 때마다 결과가 즉시 업데이트됩니다.

## Name or ID {#name-or-id}

Type part of a planet's name or natural ID (e.g. "OT-580" or "Montem") in the box at the top. A name search shows every planet that matches it, even when the filters set in the panel would hide some: a note above the results says the filters are paused. _Apply filters_ combines the name with them again; the note then says how many matching planets the filters hide and offers up to three changes that would show more of them, each with the number of planets it adds. _Show all_ pauses the filters again. Your filters are kept either way; once the name is cleared, the next search starts with them paused again.

## Materials {#materials}

Each group matches _any of_ or _all of_ its materials, and the groups combine with _all groups_ or _any group_. 이를 통해 '(FEO and H2O) or (MAG and O)'와 같은 검색도 할 수 있습니다. 모든 자원에 대해 일일 최소 채굴량을 개/일 단위로 지정할 수 있습니다.

## Planet conditions {#planet-conditions}

Pick Rocky and/or Gaseous planets, and whether they must be fertile. 새 검색을 시작하면 기본적으로 암석형 행성만 선택되어 있습니다. 중력, 기압, 온도는 그에 따라 추가로 필요한 건설 자재(MGC, BL, SEA, HSE, INS, TSH)를 통해서만 영향을 미칩니다. 체크하지 않은 자재가 필요한 행성은 숨겨지므로, 아무것도 체크하지 않으면 추가 자재가 필요 없는 행성만 표시됩니다.

## COGC and infrastructure {#cogc-and-infrastructure}

_Active COGC program_ keeps planets running one of the ticked programs right now. 행성에 체크한 건물이 모두 있어야 합니다(LM 지역 시장, COGC 상공회의소, WAR 창고, ADM 행정 센터, SHY 조선소).

## Counts and Any {#counts-and-any}

The number next to an option that isn't ticked is how many planets you would get by ticking it. 행성 조건, 추가 건설 자재 허용, 진행 중인 COGC 프로그램, 기반 시설 섹션의 제목 옆에 있는 _상관없음_ 버튼을 누르면 해당 섹션이 가장 적은 행성을 걸러 내는 상태로 설정되고, 그때 표시되는 행성 수를 보여 줍니다. 해당 섹션이 이미 그 상태라면 이 옵션은 강조 표시되며 더 이상 클릭할 수 없습니다.

## Distance {#distance}

Pick exchanges and/or plans from one of your empires. 행성은 선택한 모든 대상으로부터 최대 점프 수 이내에 있어야 하며, 선택한 계획마다 별도의 점프 수 열이 표시됩니다. AI1, CI1, IC1, NC1 열은 항상 정렬할 수 있습니다. Planet Search works without an account; distances to your own plans need a login.

## Active filters and Reset {#active-filters-and-reset}

Every active filter shows as a chip above the results; × on a chip removes just that filter. _Reset_ at the top right goes back to the starting filters and the default order. 조건에 맞는 행성이 없으면 최대 세 개의 제안이 표시되며, 각 제안에는 적용 시 나타날 행성 수가 함께 표시됩니다.

## Filter panel {#filter-panel}

On larger screens the double arrow at the top of the panel collapses it to a narrow rail, and expands it again. 작은 화면에서는 _필터_ 버튼을 누르면 필터가 서랍형 패널로 열리며, 패널 하단의 _행성 n개 보&#xAE30;_&#xB97C; 누르면 닫힙니다.

## List and Matrix {#list-and-matrix}

The List shows the searched materials as tiles next to the other resources. 매트릭스 보기에서는 검색 결과에 있는 모든 자원이 각각 별도의 열로 표시됩니다. 검색한 자원이 먼저 나오며, 일일 채굴량이 많을수록 음영이 진하게 표시됩니다.

## Chart {#chart}

The Chart plots every result by distance and output: across, the jumps to your _Distance_ picks (the farthest one when you picked several), or to the nearest exchange without a pick; up, the daily extraction of a searched material you choose (fertility when you search no material). 점이 클수록 비옥도가 높습니다. The **best trade-off** planets are the ones no other result beats on both: none is closer _and_ richer. 이 행성들은 강조 표시되고 점선으로 연결되며, 이 선의 오른쪽 아래에 있는 행성은 모두 이들 중 하나보다 불리합니다. _COGC별 색&#xC0C1;_&#xC744; 켜면 점의 색이 대신 각 행성에서 진행 중인 COGC 프로그램에 따라 표시됩니다. 점에 마우스를 올리면 세부 정보를 볼 수 있고, 클릭하면 비교 목록에 고정되며, 더블 클릭하면 계획을 만들 수 있습니다. 차트 옆 목록에서는 같은 행성들을 산출량 순으로 보여 줍니다. 차트에는 최대 300개의 결과가 표시되며, 현재 정렬 기준에서 상위에 있는 결과부터 표시됩니다.

## Reading the results {#reading-the-results}

The colour bar on a material tile compares the planet's daily extraction with the highest of that material on any planet: red is below a quarter, then orange, yellow, and green above three quarters. 건설 아이콘이 있는 열에는 해당 행성에 추가로 필요한 건설 자재가 나열됩니다. 자재에 마우스를 올리면 그 이유를 볼 수 있습니다(예: "중력이 낮음"). _COGC · 기반 시설_ 열에는 현재 진행 중인 COGC 프로그램과 행성의 기반 시설이 LM, COGC, WAR, ADM, SHY로 표시됩니다. 점프 수 열에 "—"가 표시되면 점프 경로가 없다는 뜻입니다. 마우스를 올리면 "이주선 필요함"이라는 문구를 볼 수 있습니다.

## Plots {#plots}

Every base takes one plot of its planet, and so do HQs and planetary projects (COGC, warehouse, local market and the others). A planet that can't be settled anymore, with every plot taken and no ghost sites, carries a red ⊘ icon next to its name; hover it for the details. The _Plots_ column, which you turn on in the _Columns_ menu, shows the free plots out of the planet's total, as FIO last saw the planet (hover for the date), and marks such a planet red _Full_. Some planets allow **ghost sites**: once every plot is taken, new bases still fit without one, so a full planet that allows them shows an amber _Full · ghost sites_. Full planets keep their place in the results. _plots unknown_ means PRUNplanner hasn't read the planet's plots yet. Sort by the column to see the planets with the most free plots first.

## Sorting {#sorting}

Click a column header to sort by it, click again to reverse. Shift+click another header to add it as a tiebreaker (the headers show 1, 2, 3), up to four columns: "NC1 jumps, then FEO /day" lists the richest FEO planets at each distance. _정렬_ 메뉴를 사용하면 키보드 없이도 같은 기능을 쓸 수 있습니다. 먼저 검색한 첫 번째 물자 기준(높은 순), 물자를 검색하지 않았다면 거리에서 처음 선택한 지점까지의 점프 수 기준, 둘 다 없다면 이름순입니다.

## Columns {#columns}

The _Columns_ menu hides and shows columns. 매트릭스 화면에서는 검색한 모든 물자도 함께 나열되며, _전&#xCCB4;_&#xC640; _없&#xC74C;_&#xC73C;로 한 번에 표시하거나 숨길 수 있습니다. _Reset_ goes back to the default columns.

## Compare {#compare}

On larger screens, pin up to four planets with ☆ to compare them side by side in the tray at the bottom. 비옥도, 검색한 물자, 거리에서 선택한 지점까지의 점프 수는 가장 좋은 값부터 나쁜 값까지 색으로 구분되며, 가장 좋은 값은 굵게 표시됩니다. 그 밖의 항목에서 행성 간 차이가 있는 행은 파란색으로 표시됩니다.

## Saving and sharing {#saving-and-sharing}

The address bar always holds the whole search, so _Copy link_ shares it. "+"를 누르면 해당 행성의 새 계획이 새 탭에서 열리므로, 검색 결과는 그대로 유지됩니다. Without an account, "+" asks you to log in first and then opens the plan. _검색 저&#xC7A5;_&#xC744; 누르면 이름을 붙인 검색을 이 브라우저에 저장하고, _관&#xB9AC;_&#xC5D0;서 저장한 검색의 이름을 바꾸거나 불러오거나 삭제할 수 있습니다.
