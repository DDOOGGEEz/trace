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

var lookup = function(input, offset, callback, error) {
    input = input.trim();

    // 判斷是否是比特幣交易哈希（64 位十六進位）
    if (/^[0-9a-fA-F]{64}$/.test(input)) {
        // 比特幣交易查詢
        cachedJSONAsync("https://blockchain.info/rawtx/" + input + "?cors=true", function(transaction) {
            // 提取交易輸入的地址，並重新查詢
            lookup(transaction["inputs"][0]["prev_out"]["addr"], 0, callback, error);
        }, error);
    }
    // 判斷是否為比特幣地址 (P2PKH, P2SH, Bech32)
    else if (/^(1[1-9A-HJ-NP-Za-km-z]{25,34})$/.test(input) || /^(3[1-9A-HJ-NP-Za-km-z]{25,34})$/.test(input) || /^(bc1[a-zA-HJ-NP-Z0-9]{39,59})$/.test(input)) {
        // 比特幣地址查詢
        cachedJSONAsync("https://blockchain.info/multiaddr?active=" + input + "&n=100&offset=" + offset + "&cors=true", callback, error);
    }
    // 以太坊地址查詢
	else if (/^0x[a-fA-F0-9]{40}$/.test(input)) {
    var apiKey = 'apikey';  // 替換為你的 OKLink API 密鑰
    var url = `https://www.oklink.com/api/v5/explorer/address/transaction-list?chainShortName=eth&address=${input}&limit=20`;

    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.setRequestHeader("OK-ACCESS-KEY", apiKey);
    request.onreadystatechange = function() {
        if (request.readyState == 4) {
            if (request.status == 200) {
                var data = JSON.parse(request.responseText);
                if (data.code === "0" && data.data.length > 0) {
                    processTransactions(data.data[0].transactionLists, 'ETH'); // 傳遞 'ETH' 作為 chainType
                    callback(data);
                } else {
                    error("沒有找到交易或無效地址");
                }
            } else {
                error(request.statusText);
            }
        }
    };
    request.send();
	}

	// TRON 地址查詢
	else if (/^T[a-zA-Z0-9]{33}$/.test(input)) {
    var chainShortName = 'TRON'; // TRON 鏈
    var apiKey = 'apikey';
    var url = `https://www.oklink.com/api/v5/explorer/address/transaction-list?chainShortName=${chainShortName}&address=${input}&limit=20`;

    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.setRequestHeader("OK-ACCESS-KEY", apiKey);
    request.onreadystatechange = function() {
        if (request.readyState == 4) {
            if (request.status == 200) {
                var data = JSON.parse(request.responseText);
                if (data.code === "0" && data.data.length > 0) {
                    processTransactions(data.data[0].transactionLists, 'TRON'); // 傳遞 'TRON' 作為 chainType
                    callback(data);
                } else {
                    error("沒有找到交易或無效地址");
                }
            } else {
                error(request.statusText);
            }
        }
    };
    request.send();
	}
    // 如果是其他不支援的鏈
    else {
        error("不支援的鏈類型或無效地址！");
    }
};


// 處理不同鏈的交易
function processTransactions(transactions, chainType) {
    transactions.forEach(function(tx) {
        var source, target, value, hash;

        // 根據不同的鏈處理不同的交易格式
        if (chainType === 'BTC') {
            source = tx.inputs[0].prev_out.addr;  // BTC 的來源地址
            target = tx.out[0].addr;              // BTC 的目標地址
            value = parseFloat(tx.out[0].value) / 100000000;  // BTC 轉換為比特幣單位
            hash = tx.hash;  // BTC 的交易哈希
        } else if (chainType === 'ETH' || chainType === 'TRON') {
            source = tx.from;  // ETH 和 TRON 的來源地址
            target = tx.to;    // ETH 和 TRON 的目標地址
            value = parseFloat(tx.amount);  // ETH 和 TRON 直接使用 amount 欄位
            hash = tx.txId;  // ETH 和 TRON 的交易哈希
        }

        // 如果交易值大於 0，處理交易
        if (value > 0) {
            var defaultDistance = 1; // 默認 distance 設為 1
            var labelSource = source; // 對 source 和 target 設置 label
            var labelTarget = target;

            // 檢查並設置 source 節點
            if (!discoveredAddresses.has(source)) {
                discoveredAddresses.set(source, { final_balance: value });
                nodes.push({
                    id: source, 
                    group: chainType === 'ETH' ? 1 : 2, 
                    chainType: chainType, 
                    distance: defaultDistance, 
                    label: labelSource  // 設置 label
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
                    label: labelTarget  // 設置 label
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
            linkedAddresses.get(source)["out"].set(hash, tx); // 儲存 out 的交易
            linkedAddresses.get(target)["in"].set(hash, tx);  // 儲存 in 的交易
            linkedAddresses.get(source)["all"].set(hash, tx); // 儲存所有相關交易
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

var trace = function(hash) {
	M.toast({html: 'Loading ' + hash, displayLength: 2000})

	nodes = []
	links = []

	estimatedAddreses = new Map()
	discoveredAddresses = new Map()
	discoveredLinks = new Set()
	linkedAddresses = new Map()

	lookup(hash, 0, function(result) {updateBlockchain(hash, result, 0, 0)}, function(status) {
		console.error("Error", status)
		M.toast({html: "Error:" + status, displayLength: Infinity})
	})
	return false
}

var traceTransactionOut = function(address, hash, index) {
	// Fill the queue
	var item = linkedAddresses.get(address)["all"].get(hash)
	var firstelement = {"data": item["out"][index], "time": item["time"], "haircut": 1.0, "fifo": item["out"][index]["value"]}
	var queue = new PriorityQueue()
	var seen = new Set()
	queue.push(firstelement)
	seen.add(hash)

	// Reset variables
	taintedAddresses = new Map()
	taintOrigin = address
	taintValue = item["out"][index]["value"]

	// Go!
	while(queue.size() > 0) {
		var item = queue.pop()

		var balance = (discoveredAddresses.has(item["data"]["addr"]) ? discoveredAddresses.get(item["data"]["addr"])["final_balance"] : estimatedAddreses.get(item["data"]["addr"]))
		var total = balance
		var fifobalance = item["fifo"]

		if(linkedAddresses.has(item["data"]["addr"])) {
			var transactions = Array.from(linkedAddresses.get(item["data"]["addr"])["out"].values())
			transactions.sort(function(a, b) {return a["time"] - b["time"]})

			for(var transaction of transactions) {
				if(seen.has(transaction["hash"])) continue
				seen.add(transaction["hash"])
			
				if(transaction["time"] > item["time"]) continue

				for(var out of transaction["out"]) total += out["value"]

				for(var i = 0; i < transaction["out"].length; i++) {
					var fifoout = Math.min(fifobalance, transaction["out"][i]["value"])
					fifobalance -= fifoout

					queue.push({
						"data": transaction["out"][i],
						"time": transaction["time"],
						"haircut": item["haircut"] * transaction["out"][i]["value"] / total,
						"fifo": fifoout
					})
				}
			}
		}

		if(!taintedAddresses.has(item["data"]["addr"])) {
			taintedAddresses.set(item["data"]["addr"], {"poison": true, "haircut": item["haircut"] * balance / total, "fifo": fifobalance})
		} else {
			var oldvalues = taintedAddresses.get(item["data"]["addr"])
			taintedAddresses.set(item["data"]["addr"], {"poison": true, "haircut": oldvalues["haircut"] + item["haircut"] * balance / total, "fifo": oldvalues["fifo"] + fifobalance})
		}
	}

	// Update colouring, and switch to poison if on distance
	if(fillStyle < 2) fillStyle = 2
	updateFillStyle(fillStyle)
}

var traceTransactionIn = function(address, hash, index) {
	// Fill the queue
	var item = linkedAddresses.get(address)["all"].get(hash)
	var firstelement = {"data": item["inputs"][index]["prev_out"], "time": item["time"], "haircut": 1.0, "fifo": item["inputs"][index]["prev_out"]["value"]}
	var queue = new PriorityQueue()
	var seen = new Set()
	queue.push(firstelement)
	seen.add(hash)

	// Reset variables
	taintedAddresses = new Map()
	taintOrigin = address
	taintValue = item["inputs"][index]["prev_out"]["value"]

	// Go!
	while(queue.size() > 0) {
		var item = queue.pop()

		var balance = (discoveredAddresses.has(item["data"]["addr"]) ? discoveredAddresses.get(item["data"]["addr"])["final_balance"] : estimatedAddreses.get(item["data"]["addr"]))
		var total = balance
		var fifobalance = item["fifo"]

		if(linkedAddresses.has(item["data"]["addr"])) {
			var transactions = Array.from(linkedAddresses.get(item["data"]["addr"])["in"].values())
			transactions.sort(function(a, b) {return a["time"] - b["time"]})

			for(var transaction of transactions) {
				if(seen.has(transaction["hash"])) continue
				seen.add(transaction["hash"])
			
				if(transaction["time"] < item["time"]) continue

				for(var inpu of transaction["inputs"]) total += inpu["prev_out"]["value"]

				for(var i = 0; i < transaction["inputs"].length; i++) {
					var fifoout = Math.min(fifobalance, transaction["inputs"][i]["prev_out"]["value"])
					fifobalance -= fifoout

					queue.push({
						"data": transaction["inputs"][i]["prev_out"],
						"time": transaction["time"],
						"haircut": item["haircut"] * transaction["inputs"][i]["prev_out"]["value"] / total,
						"fifo": fifoout
					})
				}
			}
		}

		if(!taintedAddresses.has(item["data"]["addr"])) {
			taintedAddresses.set(item["data"]["addr"], {"poison": true, "haircut": item["haircut"] * balance / total, "fifo": fifobalance})
		} else {
			var oldvalues = taintedAddresses.get(item["data"]["addr"])
			taintedAddresses.set(item["data"]["addr"], {"poison": true, "haircut": oldvalues["haircut"] + item["haircut"] * balance / total, "fifo": oldvalues["fifo"] + fifobalance})
		}
	}

	// Update colouring, and switch to poison if on distance
	if(fillStyle < 2) fillStyle = 2
	updateFillStyle(fillStyle)
}
