export const highchartsOptions: Highcharts.Options = {
	chart: {
		styledMode: false,
		backgroundColor: "transparent",
	},
	lang: {
		thousandsSep: ",",
	},
	accessibility: {
		enabled: false,
	},
	colors: [
		"#2b908f",
		"#90ee7e",
		"#f45b5b",
		"#7798BF",
		"#aaeeee",
		"#ff0066",
		"#eeaaee",
		"#55BF3B",
		"#DF5353",
		"#7798BF",
		"#aaeeee",
	],
	title: {
		style: {
			color: "#E0E0E3",
			textTransform: "uppercase",
			fontSize: "20px",
		},
	},
	subtitle: {
		style: {
			color: "#E0E0E3",
			textTransform: "uppercase",
		},
	},
	xAxis: {
		gridLineColor: "#707073",
		labels: {
			style: {
				color: "#E0E0E3",
			},
		},
		lineColor: "#707073",
		minorGridLineColor: "#505053",
		tickColor: "#707073",
		title: {
			style: {
				color: "#A0A0A3",
			},
		},
	},
	yAxis: {
		gridLineColor: "#707073",
		labels: {
			style: {
				color: "#E0E0E3",
			},
		},
		lineColor: "#707073",
		minorGridLineColor: "#505053",
		tickColor: "#707073",
		tickWidth: 1,
		title: {
			style: {
				color: "#A0A0A3",
			},
		},
	},
	tooltip: {
		backgroundColor: "rgba(0, 0, 0, 0.85)",
		style: {
			color: "#F0F0F0",
		},
	},
	plotOptions: {
		series: {
			dataLabels: {
				color: "#F0F0F3",
				style: {
					fontSize: "13px",
				},
			},
			marker: {
				lineColor: "#333",
			},
		},
		boxplot: {
			fillColor: "#505053",
		},
		candlestick: {
			lineColor: "white",
		},
		errorbar: {
			color: "white",
		},
		bar: {
			borderRadius: 0,
		},
		column: {
			borderRadius: 0,
		},
	},
	legend: {
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		itemStyle: {
			color: "#E0E0E3",
		},
		itemHoverStyle: {
			color: "#FFF",
		},
		itemHiddenStyle: {
			color: "#606063",
		},
		title: {
			style: {
				color: "#C0C0C0",
			},
		},
	},
	credits: {
		style: {
			color: "#666",
		},
	},

	drilldown: {
		activeAxisLabelStyle: {
			color: "#F0F0F3",
		},
		activeDataLabelStyle: {
			color: "#F0F0F3",
		},
	},

	navigation: {
		buttonOptions: {
			symbolStroke: "#DDDDDD",
			theme: {
				fill: "#505053",
			},
		},
	},

	// Scroll charts
	rangeSelector: {
		buttonTheme: {
			fill: "#505053",
			stroke: "#000000",
			style: {
				color: "#CCC",
			},
			states: {
				hover: {
					fill: "#707073",
					stroke: "#000000",
					style: {
						color: "white",
					},
				},
				select: {
					fill: "#000003",
					stroke: "#000000",
					style: {
						color: "white",
					},
				},
			},
		},
		inputBoxBorderColor: "#505053",
		inputStyle: {
			backgroundColor: "#333",
			color: "silver",
		},
		labelStyle: {
			color: "silver",
		},
	},

	navigator: {
		handles: {
			backgroundColor: "#666",
			borderColor: "#AAA",
		},
		outlineColor: "#CCC",
		maskFill: "rgba(255,255,255,0.1)",
		series: {
			color: "#7798BF",
			lineColor: "#A6C7ED",
		},
		xAxis: {
			gridLineColor: "#505053",
		},
	},

	scrollbar: {
		barBackgroundColor: "#808083",
		barBorderColor: "#808083",
		buttonArrowColor: "#CCC",
		buttonBackgroundColor: "#606063",
		buttonBorderColor: "#606063",
		rifleColor: "#FFF",
		trackBackgroundColor: "#404043",
		trackBorderColor: "#404043",
	},
};
