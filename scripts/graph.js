var nodes = []
var links = []

var width = window.innerWidth
var height = window.innerHeight

// 字符串截斷函數，用於顯示部分過長的文本
String.prototype.trunc = String.prototype.trunc || function (n) {return (this.length > n) ? this.substr(0, n) + '...' : this}

// 更新圖表寬度和高度
var svg = d3.select('svg')
svg.attr('width', width).attr('height', height)

svg.append('defs').append('marker')
	.attr('id', 'arrowhead')
	.attr('viewBox', '-0 -5 10 10')
	.attr('refX', 20)
	.attr('refY', 0)
	.attr('orient', 'auto')
	.attr('markerWidth', 10)
	.attr('markerHeight', 10)
	.attr('xoverflow', 'visible')
	.append('svg:path')
	.attr('d', 'M 0,-5 L 10 ,0 L 0,5')
	.attr('fill', 'rgb(127, 127, 127)')
	.style('stroke','none')

// 連線和節點的更新
var linkElements, nodeElements
var linkGroup = svg.append('g').attr('class', 'links')
var nodeGroup = svg.append('g').attr('class', 'nodes')

// 設置碰撞力
var collide = d3.forceCollide().radius(function(node) {
	var balance = (discoveredAddresses.has(node.id) ? discoveredAddresses.get(node.id)["final_balance"] : estimatedAddreses.get(node.id)) / 100000000.0
	return 2*(Math.log(Math.max(1, balance)) * 10 + 10)
})

// 設置模擬運行方式，包括碰撞力、鏈接力、中心對齊等
var simulation = d3
	.forceSimulation()
	.force("collide", collide)
	.force('link', d3.forceLink().id(function(link) { return link.id }))
	.force('charge', d3.forceManyBody().strength(-100).distanceMax(200))
	.force('center', d3.forceCenter(width / 2, height / 2))
	.velocityDecay(0.95)

// 拖動節點時的操作
var dragDrop = d3.drag().on('start', function(node) {
	node.fx = node.x
	node.fy = node.y
}).on('drag', function(node) {
	simulation.alphaTarget(0.7).restart()
	node.fx = d3.event.x
	node.fy = d3.event.y
}).on('end', function(node) {
	if (!d3.event.active) simulation.alphaTarget(0)
	node.fx = null
	node.fy = null
})

// 當窗口大小改變時，更新畫布大小
d3.select(window).on('resize', resize);
function resize() {
	var width = window.innerWidth, height = window.innerHeight;
	svg.size([width, height]);
	simulation.force('center', d3.forceCenter(width / 2, height / 2))
	simulation.restart()
}

// 定義提示框
var tooltip = d3.select("#tooltip")
var tooltipActive = false

// 設置縮放功能
svg.call(d3.zoom().scaleExtent([1 / 8, 8]).on("zoom", zoomed));
function zoomed() {
	nodeGroup.attr("transform", d3.event.transform);
	linkGroup.attr("transform", d3.event.transform);
}

// 節點選擇功能：當點擊節點時，會顯示詳細信息
function selectNode(selectedNode) {
	d3.select(this).attr('fill', 'rgba(127, 127, 127, 0.5)')
	M.toast({html: 'Loading ' + selectedNode.id, displayLength: 2000})
	lookup(selectedNode.id, 0, function(result) { updateBlockchain(selectedNode.id, result, 0, selectedNode.distance) }, function(status) {
		M.toast({html: "Error:" + status, displayLength: Infinity})
		console.error("Error", status)
	})
}

// 更新填充樣式
var fillStyle = 0;
var updateFillStyle = function(choosen) {
	fillStyle = choosen
	
	nodeElements.remove()
	updateSimulation()
}

// 更新圖表
function updateGraph() {
	// 更新連線
	linkElements = linkGroup.selectAll('line')
		.data(links, function(link) { return link.target.id + link.source.id })

	linkElements.exit().remove()

	var linkEnter = linkElements
		.enter().append('line')
		.attr('stroke-width', 1)
		.attr('id', function(node) { return 'link_' + node.source + '_' + node.target })
		.attr('class', function(node) { return 'connects_' + node.source + ' connects_' + node.target })
		.attr('stroke', 'rgb(127, 127, 127)')
		.attr('opacity', '0.25')
		.attr('marker-end', 'url(#arrowhead)')

	linkElements = linkEnter.merge(linkElements)

	// 更新節點
	nodeElements = nodeGroup.selectAll('circle')
		.data(nodes, function(node) { return node.id })

	nodeElements.exit().remove()

	var nodeEnter = nodeElements
		.enter()
		.append('circle')
		.attr('r', function(node) {
			var balance = (discoveredAddresses.has(node.id) ? discoveredAddresses.get(node.id)["final_balance"] : estimatedAddreses.get(node.id)) / 100000000.0
			return Math.log(Math.max(1, balance)) * 10 + 10
		})
		.attr('id', function(node) { return 'node_' + node.id })
		.attr('fill', function(node) {
			var transaction = linkedAddresses.get(node.id);  // 確保交易存在
			var isOutAvailable = transaction && transaction.out && Array.isArray(transaction.out);  // 檢查 out 是否存在
			// 根據不同鏈進行不同處理
			//console.log(fillStyle)
			//console.log(node.distance)
			switch (fillStyle) {
				default:
				case 0: return 'hsla(' + (node.distance * 15) + ', 90%, 50%, 0.85)';  // 根據距離計算顏色
				case 1: return 'rgba(127, 127, 255, 0.85)';  // 單色填充
				case 2: return node.id == taintOrigin ? 'rgba(127, 127, 255, 0.85)' : (taintedAddresses.has(node.id) && taintedAddresses.get(node.id)["poison"] ? 'rgba(255, 0, 0, 0.85)' : 'rgba(127, 196, 127, 0.85)'); // 污染狀態
				case 3: return node.id == taintOrigin ? 'rgba(127, 127, 255, 0.85)' : (taintedAddresses.has(node.id) && taintedAddresses.get(node.id)["haircut"] > 0 ? 'rgba(' + Math.floor(taintedAddresses.get(node.id)["haircut"] * 255) + ', 0, 0, 0.85)' : 'rgba(127, 196, 127, 0.85)'); // Haircut
				case 4: return node.id == taintOrigin ? 'rgba(127, 127, 255, 0.85)' : (taintedAddresses.has(node.id) && taintedAddresses.get(node.id)["fifo"] > 0 ? 'rgba(' + Math.floor(taintedAddresses.get(node.id)["fifo"]/taintValue * 255) + ', 0, 0, 0.85)' : 'rgba(127, 196, 127, 0.85)'); // FIFO
				case 5: return isOutAvailable ? 'rgba(0, 255, 0, 0.85)' : 'rgba(255, 0, 0, 0.85)';  // 根據 'out' 是否存在設置顏色
			}
		})
		.style('cursor', 'pointer')
		.call(dragDrop)
		.on('click', selectNode)
		.on("mouseover", function(d) {
			console.log(d);
		
			// 判斷鏈的類型，設置默認為 'BTC'
			var chainType = d.chainType || 'BTC';
		
			// 根據鏈類型處理餘額
			var balance, label;
			switch (chainType.toUpperCase()) {
				case 'ETH':
					balance = (discoveredAddresses.has(d.id) ? discoveredAddresses.get(d.id)["final_balance"] : estimatedAddreses.get(d.id));
					label = "<b>" + balance.toFixed(5).toLocaleString() + " ETH</b>";
					break;
				case 'TRON':
					balance = (discoveredAddresses.has(d.id) ? discoveredAddresses.get(d.id)["final_balance"] : estimatedAddreses.get(d.id));
					label = "<b>" + balance.toFixed(5).toLocaleString() + " TRX</b>";
					break;
				default:
					balance = (discoveredAddresses.has(d.id) ? discoveredAddresses.get(d.id)["final_balance"] : estimatedAddreses.get(d.id)) / 100000000.0;
					label = "<b>" + balance.toFixed(5).toLocaleString() + " BTC</b>";
					break;
			}
		
			// 設置 tooltip 的內容
			tooltip.select('#tooltip-title').html(d.label);
			tooltip.select('#tooltip-value').html((!discoveredAddresses.has(d.id) ? "Estimated: " : "") + label);
		
			// 檢查 linkedAddresses 是否包含該節點，並確保 out 和 in 是 Map 類型，防止 undefined 錯誤
			var linkedData = linkedAddresses.get(d.id);
			if (linkedData && linkedData["out"] instanceof Map && linkedData["in"] instanceof Map) {
				tooltip.select('#tooltip-allcount').html(linkedData["out"].size + linkedData["in"].size);
				tooltip.select('#tooltip-outcount').html(linkedData["out"].size);
				tooltip.select('#tooltip-incount').html(linkedData["in"].size);
			} else {
				// 如果沒有交易數據，設置默認值為 0
				tooltip.select('#tooltip-allcount').html(0);
				tooltip.select('#tooltip-outcount').html(0);
				tooltip.select('#tooltip-incount').html(0);
			}
		
			// 顯示交易日誌
			var tx_log = "";
			console.log("linkedData:", linkedData);
			if (linkedData && linkedData["all"] instanceof Map) {
				linkedData["all"].forEach(function (value, key, map) {
					// 轉換交易時間為可讀格式（BTC 使用 `time`，ETH 和 TRON 使用 `transactionTime`）
					var timestamp, formattedDate;
					if (chainType === 'BTC') {
						timestamp = value.time * 1000;  // BTC 的時間是以秒為單位，需要轉換成毫秒
					} else {
						timestamp = value.transactionTime;
					}
			
					var date = new Date(parseInt(timestamp));
					formattedDate = date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-' +
						date.getDate().toString().padStart(2, '0') + ' ' + date.getHours().toString().padStart(2, '0') + ':' +
						date.getMinutes().toString().padStart(2, '0') + ':' + date.getSeconds().toString().padStart(2, '0');
			
					if (chainType === 'BTC') {
						// BTC 的處理邏輯 - 處理 `out`
						if (linkedData["out"].has(value['hash']) && Array.isArray(value['out'])) {
							for (var i = 0; i < value['out'].length; i++) {
								var y = value['out'][i];
								var txt = '<b>' + (Math.floor((y['value'] / 100000000) * 100000) / 100000).toFixed(5) + '</b> BTC';
								tx_log += "<button style='width: 100%; margin: 2px;' class=\"btn waves-effect waves-light red\" onclick=\"traceTransactionOut('" + d.id + "', '" + value["hash"] + "'," + i + ")\" title=\"Trace\">" +
									"<i class=\"material-icons left\">keyboard_arrow_left</i> " + txt + " (" + ("addr" in y ? y['addr'].trunc(10) : "???") + ")</button><br />" +
									"<small>時間: " + formattedDate + "</small><br />";  // 加上時間顯示
							}
						}
			
						// BTC 的處理邏輯 - 處理 `in`
						if (linkedData["in"].has(value['hash']) && Array.isArray(value['inputs'])) {
							for (var i = 0; i < value['inputs'].length; i++) {
								var y = value['inputs'][i]['prev_out'];
								var txt = '<b>' + (Math.floor((y['value'] / 100000000) * 100000) / 100000).toFixed(5) + '</b> BTC';
								tx_log += "<button style='width: 100%; margin: 2px;' class=\"btn waves-effect waves-light\" onclick=\"traceTransactionIn('" + d.id + "', '" + value["hash"] + "'," + i + ")\" title=\"Trace\">" +
									"<i class=\"material-icons left\">keyboard_arrow_right</i> " + txt + " (" + ("addr" in y ? y['addr'].trunc(10) : "???") + ")</button><br />" +
									"<small>時間: " + formattedDate + "</small><br />";  // 加上時間顯示
							}
						}
					} else if (chainType === 'ETH' || chainType === 'TRON') {
						// ETH 或 TRON 的處理邏輯 - 處理 `out`
						if (linkedData["out"].has(key)) {
							var tx = linkedData["out"].get(key);
							var amount = Math.floor(tx.amount * 100000) / 100000;  // 無條件捨去到小數點第五位
							var txt = '<b>' + amount.toFixed(5) + '</b> ' + (chainType === 'ETH' ? 'ETH' : 'TRX');
							tx_log += "<button style='width: 100%; margin: 2px;' class=\"btn waves-effect waves-light red\" onclick=\"traceTransactionOut('" + d.id + "', '" + key + "'," + i + ")\" title=\"Trace\">" +
								"<i class=\"material-icons left\">keyboard_arrow_left</i> " + txt + " (" + tx.to.trunc(10) + ")</button><br />" +
								"<small>時間: " + formattedDate + "</small><br />";  // 加上時間顯示
						}
			
						// ETH 或 TRON 的處理邏輯 - 處理 `in`
						if (linkedData["in"].has(key)) {
							var txIn = linkedData["in"].get(key);
							var amountIn = Math.floor(txIn.amount * 100000) / 100000;  // 無條件捨去到小數點第五位
							var txtIn = '<b>' + amountIn.toFixed(5) + '</b> ' + (chainType === 'ETH' ? 'ETH' : 'TRX');
							tx_log += "<button style='width: 100%; margin: 2px;' class=\"btn waves-effect waves-light\" onclick=\"traceTransactionIn('" + d.id + "', '" + key + "'," + i + ")\" title=\"Trace\">" +
								"<i class=\"material-icons left\">keyboard_arrow_right</i> " + txtIn + " (" + txIn.from.trunc(10) + ")</button><br />" +
								"<small>時間: " + formattedDate + "</small><br />";  // 加上時間顯示
						}
					}
				});
			}
		
			// 更新 tooltip 日誌
			tooltip.select('#tooltip-log').html(tx_log);
		
			// 設置 tooltip 顯示位置
			tooltip.style("left", (d3.event.pageX + 15) + "px").style("top", (d3.event.pageY - 28) + "px");
			tooltipActive = true;
			d3.selectAll(".connects_" + d.id).attr('opacity', '1');
			tooltip.style("display", "block");
		})
		.on("mouseout", function(d) {
			// 隱藏 tooltip
			tooltipActive = false;
			setTimeout(function() {
				if (!tooltipActive) tooltip.style("display", "none");
			}, 500);
			d3.selectAll(".connects_" + d.id).attr('opacity', '0.25');
		});

	nodeElements = nodeEnter.merge(nodeElements)
}

document.getElementById('tooltip').addEventListener("mouseenter", function() {
	tooltipActive = true
})
document.getElementById('tooltip').addEventListener("mouseleave", function() {
	tooltipActive = false
})

function KeyPress(e) {
    var evtobj = window.event? event : e
    if (evtobj.keyCode == 84 && evtobj.shiftKey) toggleTooltip();
}

document.onkeydown = KeyPress;

function toggleTooltip() {
    var tooltip = document.getElementById('tooltip');
    if (tooltip.style.visibility == 'hidden') {
        tooltip.style.visibility = 'visible';
    } else {
        tooltip.style.visibility = 'hidden';
    }
}

// 更新模擬狀態
function updateSimulation() {
	updateGraph()

	simulation.nodes(nodes).on('tick', function() {
		nodeElements
        	.attr('cx', function(node) { return node.x || 0; })  // 避免 NaN
        	.attr('cy', function(node) { return node.y || 0; });

    	linkElements
        	.attr('x1', function(link) { return link.source.x || 0; })
        	.attr('y1', function(link) { return link.source.y || 0; })
        	.attr('x2', function(link) { return link.target.x || 0; })
        	.attr('y2', function(link) { return link.target.y || 0; });
	})

	simulation.force('link').links(links)
	simulation.alphaTarget(0.7).restart()
}

// 開始更新模擬
updateSimulation()