class PriorityQueue {
	constructor(comparator = (a, b) => a > b) {
		this._heap = [];
		this._comparator = comparator;
	}
	size() {return this._heap.length;}
	isEmpty() {return this.size() == 0;}
	peek() {return this._heap[0];}
	push(...values) {
		values.forEach(value => {
			this._heap.push(value);
			this._siftUp();
		});
		return this.size();
	}
	pop() {
		const poppedValue = this.peek();
		const bottom = this.size() - 1;
		if (bottom > 0) this._swap(0, bottom);

		this._heap.pop();
		this._siftDown();
		return poppedValue;
	}
	_parent(i) {return ((i + 1) >>> 1) - 1}
	_left(i) {return (i << 1) + 1}
	_right(i) {return (i + 1) << 1}
	replace(value) {
		const replacedValue = this.peek();
		this._heap[0] = value;
		this._siftDown();
		return replacedValue;
	}
	_greater(i, j) {return this._comparator(this._heap[i], this._heap[j]);}
	_swap(i, j) {[this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];}
	_siftUp() {
		let node = this.size() - 1;
		while (node > 0 && this._greater(node, this._parent(node))) {
			this._swap(node, this._parent(node));
			node = this._parent(node);
		}
	}
	_siftDown() {
		let node = 0;
		while (
			(this._left(node) < this.size() && this._greater(this._left(node), node)) ||
			(this._right(node) < this.size() && this._greater(this._right(node), node))
		) {
			let maxChild = (this._right(node) < this.size() && this._greater(this._right(node), this._left(node))) ? this._right(node) : this._left(node);
			this._swap(node, maxChild);
			node = maxChild;
		}
	}
}

var getJSONAsync = function(url, callback, error) {
	var request = new XMLHttpRequest()
	request.onreadystatechange = function() {
		if(this.readyState == 4) {
			if(this.status == 200) {
				callback(JSON.parse(this.responseText))
			} else {
				error(request.statusText)
			}
		}
	}
	request.open("GET", url, true)
	request.send()
}

var testLocalStorage = function() {
	var test = "test"
	try {
		localStorage.setItem(test, test)
		localStorage.removeItem(test)
		return true
	} catch(e) {
		delete localStorage // Delete localStorage for faster checking
		return false
	}
}

var cachedJSONAsync = function(url, callback, error) {
	// // Fallback if localStorage is unavailable
	// if(typeof localStorage == "undefined") {
	// 	getJSONAsync(url, callback, error)
	// 	return
	// }

	// // If data is fresh
	// if(localStorage.hasOwnProperty(url)) {
	// 	try {
	// 		var cached = JSON.parse(localStorage.getItem(url))
	// 		if(Date.now() < cached.time + 10 * 60 * 1000) {
	// 			console.log("Serving " + url + " from cache.")
	// 			callback(cached.data)
	// 			return
	// 		}
	// 	} catch(e) {
	// 		// Remove invalid data
	// 		localStorage.removeItem(url)
	// 	}
	// }

	// Update cache
	getJSONAsync(url, function(data) {
		console.log("Updating " + url)
		// localStorage.setItem(url, JSON.stringify({data: data, time: Date.now()}))
		callback(data)
	}, error)
}

var selectedChainType = "BTC";  // 預設選擇BTC
var errorDisplayed = false;  // 標記是否已顯示錯誤

// 監聽選單變更
function changeChainType(chainType) {
    selectedChainType = chainType;
    errorDisplayed = false; // 切換鏈時重置錯誤顯示
}

var lookup = function(input, offset, callback, error) {
    input = input.trim();

    function showErrorMessage(message) {
        if (!errorDisplayed) {
            M.toast({html: message, displayLength: 3000});
            console.warn(message);  // 顯示在控制台以供開發者檢查
            errorDisplayed = true;  // 設置為已顯示錯誤
        }
    }

    if (selectedChainType === "BTC") {
        // BTC查詢邏輯
        if (/^[0-9a-fA-F]{64}$/.test(input)) {
            cachedJSONAsync("https://blockchain.info/rawtx/" + input + "?cors=true", function(transaction) {
                lookup(transaction["inputs"][0]["prev_out"]["addr"], 0, callback, error);
            }, function() { showErrorMessage("無效的BTC交易哈希"); });
        } else if (/^(1[1-9A-HJ-NP-Za-km-z]{25,34})$/.test(input) || /^(3[1-9A-HJ-NP-Za-km-z]{25,34})$/.test(input) || /^(bc1[a-zA-HJ-NP-Z0-9]{39,59})$/.test(input)) {
            cachedJSONAsync("https://blockchain.info/multiaddr?active=" + input + "&n=100&offset=" + offset + "&cors=true", callback, function() { showErrorMessage("無效的BTC地址"); });
        } else {
            showErrorMessage("無效的BTC地址格式");
        }
    } else if (selectedChainType === "ETH") {
        // ETH查詢邏輯
        if (/^0x[a-fA-F0-9]{40}$/.test(input)) {
            var apiKey = 'c016fb71-21bb-469e-b8bd-9243950461b3';
            var url = `https://www.oklink.com/api/v5/explorer/address/transaction-list?chainShortName=eth&address=${input}&limit=20`;
            var request = new XMLHttpRequest();
            request.open("GET", url, true);
            request.setRequestHeader("OK-ACCESS-KEY", apiKey);
            request.onreadystatechange = function() {
                if (request.readyState == 4) {
                    if (request.status == 200) {
                        var data = JSON.parse(request.responseText);
                        if (data.code === "0" && data.data.length > 0) {
                            processTransactions(data.data[0].transactionLists, 'ETH');
                            callback(data);
                        } else {
                            showErrorMessage("沒有找到交易或無效的ETH地址");
                        }
                    } else {
                        showErrorMessage(request.statusText);
                    }
                }
            };
            request.send();
        } else {
            showErrorMessage("無效的ETH地址格式");
        }
    } else if (selectedChainType === "TRON") {
        // TRON查詢邏輯
        if (/^T[a-zA-Z0-9]{33}$/.test(input)) {
            var apiKey = 'c016fb71-21bb-469e-b8bd-9243950461b3';
            var usdtContractAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
            var url = `https://www.oklink.com/api/v5/explorer/address/transaction-list?chainShortName=TRON&address=${input}&protocolType=token_20&tokenContractAddress=${usdtContractAddress}&limit=20`;
            var request = new XMLHttpRequest();
            request.open("GET", url, true);
            request.setRequestHeader("OK-ACCESS-KEY", apiKey);
            request.onreadystatechange = function() {
                if (request.readyState == 4) {
                    if (request.status == 200) {
                        var data = JSON.parse(request.responseText);
                        if (data.code === "0" && data.data.length > 0) {
                            processTransactions(data.data[0].transactionLists, 'TRON');
                            callback(data);
                        } else {
                            showErrorMessage("沒有找到交易或無效的TRON地址");
                        }
                    } else {
                        showErrorMessage(request.statusText);
                    }
                }
            };
            request.send();
        } else {
            showErrorMessage("無效的TRON地址格式");
        }
    } else if (selectedChainType === "BSC") {
        // BSC查詢邏輯
        if (/^0x[a-fA-F0-9]{40}$/.test(input)) {
            var apiKey = 'c016fb71-21bb-469e-b8bd-9243950461b3';
            var bscContractAddress = '0x55d398326f99059fF775485246999027B3197955';
            var url = `https://www.oklink.com/api/v5/explorer/address/transaction-list?chainShortName=bsc&address=${input}&protocolType=token_20&tokenContractAddress=${bscContractAddress}&limit=20`;
            var request = new XMLHttpRequest();
            request.open("GET", url, true);
            request.setRequestHeader("OK-ACCESS-KEY", apiKey);
            request.onreadystatechange = function() {
                if (request.readyState == 4) {
                    if (request.status == 200) {
                        var data = JSON.parse(request.responseText);
                        if (data.code === "0" && data.data.length > 0) {
                            processTransactions(data.data[0].transactionLists, 'BSC');
                            callback(data);
                        } else {
                            showErrorMessage("沒有找到交易或無效的BSC地址");
                        }
                    } else {
                        showErrorMessage(request.statusText);
                    }
                }
            };
            request.send();
        } else {
            showErrorMessage("無效的BSC地址格式");
        }
    } else {
        showErrorMessage("不支援的鏈類型或無效地址！");
    }
};


// 處理不同鏈的交易
function processTransactions(transactions, chainType) {
    transactions.forEach(function(tx) {
        let source, target, value, hash;
        let timestamp;

        // 根據不同的鏈處理不同的交易格式
        if (chainType === 'BTC') {
            timestamp = tx.time * 1000;
            source = tx.inputs[0].prev_out.addr;  // BTC 的來源地址
            target = tx.out[0].addr;              // BTC 的目標地址
            value = parseFloat(tx.out[0].value) / 100000000;  // BTC 轉換為比特幣單位
            hash = tx.hash;  // BTC 的交易哈希
        } else if (chainType === 'ETH') {
            timestamp = tx.transactionTime;
            source = tx.from;  // ETH 的來源地址
            target = tx.to;    // ETH 的目標地址
            value = parseFloat(tx.amount);  // ETH 使用 amount 欄位
            hash = tx.txId;  // ETH 的交易哈希
        } else if (chainType === 'TRON') { // USDT on TRON (TRC20)
            timestamp = tx.transactionTime;
            source = tx.from;  // TRON 的來源地址
            target = tx.to;    // TRON 的目標地址
            value = parseFloat(tx.amount);  // TRC20 使用 amount 欄位
            hash = tx.txId;  // TRC20 的交易哈希
        } else if (chainType === 'BSC') { // USDT on TRON (TRC20)
            timestamp = tx.transactionTime;
            source = tx.from;  // BSC 的來源地址
            target = tx.to;    // BSC 的目標地址
            value = parseFloat(tx.amount);  // BSC 使用 amount 欄位
            hash = tx.txId;  // BSC20 的交易哈希
		}
        // 日期篩選邏輯
        if (timestamp < dateMin * 1000 || timestamp > dateMax * 1000) return; // 確保與 dateMin/dateMax 比較正確

        // 如果交易值大於 0，處理交易
        if (value > 0) {
            const defaultDistance = 1;
            const labelSource = source;
            const labelTarget = target;

            // 檢查並設置 source 節點
            if (!discoveredAddresses.has(source)) {
                discoveredAddresses.set(source, { final_balance: value });
                nodes.push({
                    id: source, 
                    group: chainType === 'ETH' ? 1 : 2, 
                    chainType: chainType, 
                    distance: defaultDistance, 
                    label: labelSource  
                });
            }

            // 檢查並設置 target 節點
            if (!discoveredAddresses.has(target)) {
                discoveredAddresses.set(target, { final_balance: value });
                nodes.push({
                    id: target, 
                    group: chainType === 'ETH' ? 1 : 2, 
                    chainType: chainType, 
                    distance: defaultDistance, 
                    label: labelTarget  
                });
            }

            // 正確更新 `linkedAddresses`
            if (!linkedAddresses.has(source)) {
                linkedAddresses.set(source, { "out": new Map(), "in": new Map(), "all": new Map() });
            }
            if (!linkedAddresses.has(target)) {
                linkedAddresses.set(target, { "out": new Map(), "in": new Map(), "all": new Map() });
            }

            // 儲存交易到 linkedAddresses
            linkedAddresses.get(source)["out"].set(hash, tx); 
            linkedAddresses.get(target)["in"].set(hash, tx);  
            linkedAddresses.get(source)["all"].set(hash, tx); 
            linkedAddresses.get(target)["all"].set(hash, tx);

            // 添加交易的連接
            links.push({ source: source, target: target, value: value });
        }
    });

    // 更新圖表
    updateSimulation();
}

var dollarsToBitcoin = -1;
var blacklistedAddresses = ["1JArS6jzE3AJ9sZ3aFij1BmTcpFGgN86hA"]

var estimatedAddreses = new Map()
var discoveredAddresses = new Map()
var discoveredLinks = new Set()
var linkedAddresses = new Map()
var taintedAddresses = new Map()
var taintOrigin = ""
var taintValue = ""

var dateMin = new Date("2000").getTime()/1000
var dateMax = new Date("3000").getTime()/1000

var linksMax = 200;

var updateBlockchain = function(address, result, offset, distance) {
    // 確保存在 info 和 symbol_local
    if (result && result.info && result.info.symbol_local && result.info.symbol_local.conversion) {
        dollarsToBitcoin = result.info.symbol_local.conversion;
    } else {
        console.warn("symbol_local or conversion is undefined. Using default conversion rate.");
        dollarsToBitcoin = 1;
    }

    console.log(address, offset);
    window.location.hash = "!" + address;
    document.getElementById('hash').value = address;

    // 確保 addresses 欄位存在且可迭代
    if (result.addresses && Array.isArray(result.addresses)) {
        for (var addr of result.addresses) {
            discoveredAddresses.set(addr.address, addr);
        }
    } else {
        console.warn("addresses field is missing or is not iterable.");
    }

    if (result["txs"] && result["txs"].length > 0) {
        for (var transaction of result["txs"]) {
            if (transaction["time"] < dateMin || transaction["time"] > dateMax) continue;

            // 處理連接
            for (var inputs of (transaction["inputs"] || [])) {
                for (var out of (transaction["out"] || [])) {
                    var source = inputs["prev_out"]["addr"];
                    var target = out["addr"];
                    if (typeof source == "undefined" || typeof target == "undefined") continue;

                    if (!discoveredLinks.has(source + target)) {
                        discoveredLinks.add(source + target);
                        links.push({ source: source, target: target, strength: 0.7 });
                    }

                    if (!linkedAddresses.has(source)) linkedAddresses.set(source, { "in": new Map(), "out": new Map(), "all": new Map() });
                    if (!linkedAddresses.has(target)) linkedAddresses.set(target, { "in": new Map(), "out": new Map(), "all": new Map() });

                    linkedAddresses.get(source)["out"].set(transaction['hash'], transaction);
                    linkedAddresses.get(target)["in"].set(transaction['hash'], transaction);
                    linkedAddresses.get(source)["all"].set(transaction['hash'], transaction);
                    linkedAddresses.get(target)["all"].set(transaction['hash'], transaction);
                }
            }

            // 處理節點
            for (var inputs of (transaction["inputs"] || [])) {
                var addr = inputs["prev_out"]["addr"];
                if (typeof addr == "undefined" || typeof inputs == "undefined") continue;

                if (!estimatedAddreses.has(addr)) {
                    var actualDistance = distance + (discoveredLinks.has(address + addr) ? (discoveredLinks.has(addr + address) ? 0 : 1) : (discoveredLinks.has(addr + address) ? -1 : 0));
                    nodes.push({ id: addr, group: 1, label: addr, distance: actualDistance });
                    estimatedAddreses.set(addr, 0);
                } else {
                    estimatedAddreses.set(addr, Math.max(0, estimatedAddreses.get(addr) - inputs["prev_out"]["value"]));
                }
            }

            for (var out of (transaction["out"] || [])) {
                var addr = out["addr"];
                if (typeof addr == "undefined" || typeof out == "undefined") continue;

                if (!estimatedAddreses.has(addr)) {
                    estimatedAddreses.set(addr, out["value"]);
                    var actualDistance = distance + (discoveredLinks.has(address + addr) ? (discoveredLinks.has(addr + address) ? 0 : 1) : (discoveredLinks.has(addr + address) ? -1 : 0));
                    nodes.push({ id: addr, group: 1, label: addr, distance: actualDistance });
                } else {
                    estimatedAddreses.set(addr, estimatedAddreses.get(addr) + out["value"]);
                }
            }
        }

        while (links.length > linksMax) links.shift();
        updateSimulation();
    }

    if (result["txs"] && result["txs"].length == 100) {
        if (offset == 0 || offset % 100 != 0 || (offset % 100 == 0 && confirm("Do you wish to continue loading addresses? This may cause significant slowdown!"))) {
            lookup(address, offset + 100, function(result) { updateBlockchain(address, result, offset + 100, distance) }, function(status) {
                console.error("Error", status);
                M.toast({ html: "Error:" + status, displayLength: Infinity });
            });
        }
    }
};

testLocalStorage()

// trace函數傳遞selectedChainType作為參數
var trace = function(hash) {
    M.toast({html: 'Loading ' + hash, displayLength: 2000});
    errorDisplayed = false; // 開始新查詢時重置錯誤顯示

    nodes = [];
    links = [];

    estimatedAddreses = new Map();
    discoveredAddresses = new Map();
    discoveredLinks = new Set();
    linkedAddresses = new Map();

    lookup(hash, 0, function(result) {updateBlockchain(hash, result, 0, 0)}, function(status) {
        console.error("Error", status);
        showErrorMessage("Error: " + status);
    });
    return false;
};

var traceTransactionOut = function(address, hash, index) {
    // 確保鏈結數據存在
    var item = linkedAddresses.get(address)?.["all"]?.get(hash);
    if (!item || !(item["out"] || item["to"])) return; // 檢查 undefined 問題

    var transactionTime = item["time"] || item["transactionTime"] * 1000; // 適配時間戳記
    var outData = item["out"]?.[index] || { to: item["to"], value: item["amount"] || 0 }; // 適配鏈結格式

    var firstelement = {
        "data": outData,
        "time": transactionTime,
        "haircut": 1.0,
        "fifo": outData["value"] || 0
    };

    var queue = new PriorityQueue();
    var seen = new Set();
    queue.push(firstelement);
    seen.add(hash);

    // Reset variables
    taintedAddresses = new Map();
    taintOrigin = address;
    taintValue = outData["value"] || 0;

    // 遍歷所有交易
    while (queue.size() > 0) {
        var item = queue.pop();
        var addr = item["data"]["addr"] || item["data"]["to"] || item["data"]["from"]; // 適配鏈結地址
        if (!addr) continue;

        var balance = discoveredAddresses.has(addr)
            ? discoveredAddresses.get(addr)?.["final_balance"]
            : estimatedAddreses.get(addr) || 0;
        var total = balance;
        var fifobalance = item["fifo"];

        if (linkedAddresses.has(addr)) {
            var transactions = Array.from(linkedAddresses.get(addr)?.["out"]?.values() || []);
            transactions.sort((a, b) => (a["time"] || a["transactionTime"]) - (b["time"] || b["transactionTime"]));

            for (var transaction of transactions) {
                if (seen.has(transaction["hash"])) continue;
                seen.add(transaction["hash"]);

                var txTime = transaction["time"] || transaction["transactionTime"] * 1000;
                if (txTime > item["time"]) continue;

                for (var out of transaction["out"] || []) {
                    total += out["value"] || 0;
                }

                for (var i = 0; i < (transaction["out"]?.length || 0); i++) {
                    var fifoout = Math.min(fifobalance, transaction["out"][i]?.["value"] || 0);
                    fifobalance -= fifoout;

                    queue.push({
                        "data": transaction["out"][i],
                        "time": txTime,
                        "haircut": item["haircut"] * (transaction["out"][i]["value"] || 0) / total,
                        "fifo": fifoout
                    });
                }
            }
        }

        // 更新 taintedAddresses
        if (!taintedAddresses.has(addr)) {
            taintedAddresses.set(addr, {
                "poison": true,
                "haircut": item["haircut"] * balance / total,
                "fifo": fifobalance
            });
        } else {
            var oldvalues = taintedAddresses.get(addr);
            taintedAddresses.set(addr, {
                "poison": true,
                "haircut": oldvalues["haircut"] + item["haircut"] * balance / total,
                "fifo": oldvalues["fifo"] + fifobalance
            });
        }
    }

    // 更新顏色填充
    if (fillStyle < 2) fillStyle = 2;
    updateFillStyle(fillStyle);
};

var traceTransactionIn = function(address, hash, index) {
    // 確保鏈結數據存在
    var item = linkedAddresses.get(address)?.["all"]?.get(hash);
    if (!item || !(item["inputs"] || item["from"])) return; // 檢查 undefined 問題

    var transactionTime = item["time"] || item["transactionTime"] * 1000; // 適配時間戳記
    var inputData = item["inputs"]?.[index]?.["prev_out"] || { from: item["from"], value: item["amount"] || 0 }; // 適配鏈結格式

    var firstelement = {
        "data": inputData,
        "time": transactionTime,
        "haircut": 1.0,
        "fifo": inputData["value"] || 0
    };

    var queue = new PriorityQueue();
    var seen = new Set();
    queue.push(firstelement);
    seen.add(hash);

    // Reset variables
    taintedAddresses = new Map();
    taintOrigin = address;
    taintValue = inputData["value"] || 0;

    // 遍歷所有交易
    while (queue.size() > 0) {
        var item = queue.pop();
        var addr = item["data"]["addr"] || item["data"]["to"] || item["data"]["from"]; // 適配鏈結地址
        if (!addr) continue;

        var balance = discoveredAddresses.has(addr)
            ? discoveredAddresses.get(addr)?.["final_balance"]
            : estimatedAddreses.get(addr) || 0;
        var total = balance;
        var fifobalance = item["fifo"];

        if (linkedAddresses.has(addr)) {
            var transactions = Array.from(linkedAddresses.get(addr)?.["in"]?.values() || []);
            transactions.sort((a, b) => (a["time"] || a["transactionTime"]) - (b["time"] || b["transactionTime"]));

            for (var transaction of transactions) {
                if (seen.has(transaction["hash"])) continue;
                seen.add(transaction["hash"]);

                var txTime = transaction["time"] || transaction["transactionTime"] * 1000;
                if (txTime < item["time"]) continue;

                for (var input of transaction["inputs"] || []) {
                    total += input["prev_out"]?.["value"] || 0;
                }

                for (var i = 0; i < (transaction["inputs"]?.length || 0); i++) {
                    var fifoout = Math.min(fifobalance, transaction["inputs"][i]?.["prev_out"]?.["value"] || 0);
                    fifobalance -= fifoout;

                    queue.push({
                        "data": transaction["inputs"][i]["prev_out"],
                        "time": txTime,
                        "haircut": item["haircut"] * (transaction["inputs"][i]["prev_out"]?.["value"] || 0) / total,
                        "fifo": fifoout
                    });
                }
            }
        }

        // 更新 taintedAddresses
        if (!taintedAddresses.has(addr)) {
            taintedAddresses.set(addr, {
                "poison": true,
                "haircut": item["haircut"] * balance / total,
                "fifo": fifobalance
            });
        } else {
            var oldvalues = taintedAddresses.get(addr);
            taintedAddresses.set(addr, {
                "poison": true,
                "haircut": oldvalues["haircut"] + item["haircut"] * balance / total,
                "fifo": oldvalues["fifo"] + fifobalance
            });
        }
    }

    // 更新顏色填充
    if (fillStyle < 2) fillStyle = 2;
    updateFillStyle(fillStyle);
};
