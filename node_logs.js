// see https://sashat.me/2017/01/11/list-of-20-simple-distinct-colors/
let colors = [
    "rgba(67, 99, 216, 0.3)",
    "rgba(230, 25, 75, 0.3)",
    "rgba(60, 180, 75, 0.3)",
    "rgba(255, 225, 25, 0.3)",
    "rgba(245, 130, 49, 0.3)",
    "rgba(145, 30, 180, 0.3)",
    "rgba(66, 212, 244, 0.3)",
    "rgba(240, 50, 230, 0.3)",
    "rgba(191, 239, 69, 0.3)",
    "rgba(250, 190, 190, 0.3)",
    "rgba(70, 153, 144, 0.3)",
    "rgba(230, 190, 255, 0.3)",
    "rgba(154, 99, 36, 0.3)",
    "rgba(255, 250, 200, 0.3)",
    "rgba(128, 0, 0, 0.3)",
    "rgba(170, 255, 195, 0.3)",
    "rgba(128, 128, 0, 0.3)",
    "rgba(255, 216, 177, 0.3)",
    "rgba(0, 0, 117, 0.3)",
    "rgba(169, 169, 169, 0.3)",
    "rgba(0, 0, 0, 0.3)",
];

let nodeChartLines = [];
let allLogLines = [];

$("#files").on("change", loadFiles);

function loadFiles() {
    $("#files").addClass("hidden");
    let filesval = $("#files").val();

    let files = $("#files")[0].files;
    $(".duration").text("Loading " + files.length + " files...");
    doAsyncParse(files, 0);
}

function doAsyncParse(files, fileIndex) {
    $(".duration").text("Parsing log file " + fileIndex + " of " + files.length + "...");
    let reader = new FileReader();
    reader.onload = function(e) {
        parseLogFile(e.target.result, fileIndex, files.length);
        if (fileIndex < files.length-1) {
            setTimeout(function() {
                doAsyncParse(files, fileIndex+1);
            }, 50);
        }
        let isLastLog = fileIndex == files.length-1;
        if (isLastLog) {
            displayEverything();
        }
    };
    reader.readAsText(files[fileIndex]);
}

function displayEverything() {
    $(".duration").text("Rendering display...");
    setTimeout(function() {
        $(".duration").text("Rendering display... sorting node order");
        setTimeout(function() {
            sortnodeOrder()
            $(".duration").text("Rendering display... creating log line elements");
            setTimeout(function() {
                createAllLogLines();
                $(".duration").text("Rendering display... sorting all log lines");
                setTimeout(function() {
                    sortAllLogLines();
                    $(".duration").text("Rendering display... rendering visual elements");
                    setTimeout(function() {
                        drawLines();
                        drawChart();
                        bindDisplayFilters();
                    }, 50);
                }, 50);
            }, 50);
        }, 50);
    }, 50);
}

function parseLogFile(content, fileIndex, totalFiles) {

    // chart line for this node
    nodeIndex = nodeChartLines.length;
    lines = content.split("\n");
    let nodeChartLine = {};
    nodeChartLine.showLine = false;
    nodeChartLine.order = 2;
    nodeChartLine.data = [];

    let nodeSocket = "";

    let filterText = $("#filter-text").val();
    let networkEventFilter = new RegExp(".*");
    if (filterText != "") {
        try {
            networkEventFilter = new RegExp(filterText);
        }
        catch(e) {
            $("#lines").text(e);
            return;
        }
    }

    // parse lines
    for (let lineIndex=0; lineIndex<lines.length; lineIndex++) {
        let line = lines[lineIndex];
        let split = line.split(" ");
        let date = line.split(" ")[2];
        let logLevel = split[1];

        if (line.includes("Node connection info:") ){
            nodeSocket = split[split.length - 1 ].replaceAll('"', '');
        }

        let srcLine = split[3];

        // remove first parts of text
        split.shift();
        split.shift();
        split.shift();
        split.shift();
        let actual_text = split.join(" ");

        let time = Math.floor(new Date(date).getTime() / 1000);
        if (isNaN(time)) {
            continue
        }
        if (!("firstTime" in nodeChartLine)) {
            nodeChartLine["firstTime"] = time
        }
        let displayedLineIndex = nodeChartLine.data.length;
        let subseconds = date.split(".")[1].split(/[+-]/)[0];
        time = time + parseFloat("0." + subseconds);

        let showLine = true;
        if (filterText != "" && !line.match(networkEventFilter)){
            showLine = false;
        }

        // chart point
        if (showLine) {
            nodeChartLine.data.push({
                x: time,
                // y is set after nodes are sorted
                text: actual_text,
                lineIndex: displayedLineIndex,
                date: date,
                showLine,
                nodeSocket,
                srcLine,
                logLevel
            });
        }
    }

    nodeChartLines.push(nodeChartLine);

}

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
// this func sourced here: https://davidwalsh.name/javascript-debounce-function
function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

let hasBoundFilters = false;
function bindDisplayFilters () {
    if (hasBoundFilters) {
        return;
    }
    function reParseData () {
        console.info("Reparse of data triggered.")
        nodeChartLines = [];
        allLogLines = [];
        window.chart=null;

        $("#lines").empty();
        $("#chart").empty();
        $("#chart").append('<canvas id="canvas"></canvas>')
        window.chart = null;
        loadFiles()

    };

    $("#filter-text").on('input',debounce( function(e) {
        console.log("debounced filter");
        reParseData()
    }, 250));
    $("#format-text").on('input',debounce( function(e) {
        console.log("debounced format");
        reParseData()
    }, 250));
    hasBoundFilters = true;
}

function createAllLogLines() {
    for (let i=0; i<nodeChartLines.length; i++) {
        for (let j=0; j<nodeChartLines[i].data.length; j++) {
            let p = nodeChartLines[i].data[j];

            if( p.showLine ){

                // create log line
                allLogLines.push({
                    time: p.x,
                    text: p.text,
                    nodeIndex: i,
                    lineIndex: p.lineIndex,
                    logLevel: p.logLevel,
                    srcLine: p.srcLine,
                    nodeSocket: p.nodeSocket,
                    date: p.date,

                });

            }
            delete p.text;
        }
    }
}

function sortnodeOrder() {
    nodeChartLines.sort(function(a,b) {
        return a.firstTime - b.firstTime;
    });
    // update node lines with their new index
    for (let nodeIndex=0; nodeIndex<nodeChartLines.length; nodeIndex++) {
        nodeChartLines[nodeIndex].pointBackgroundColor = colors[nodeIndex];
        nodeChartLines[nodeIndex].pointBorderColor = colors[nodeIndex];
        for (let j=0; j<nodeChartLines[nodeIndex].data.length; j++) {
            nodeChartLines[nodeIndex].data[j].y = -1 * nodeIndex;
        }
    }
}

function sortAllLogLines() {
    allLogLines.sort(function(a,b) {
        return a.time - b.time;
    });
}

let linesEl = $("#lines");
function drawLines() {

    let lineTemplate = $("#format-text").val();
    for (let i=0; i<allLogLines.length; i++) {
        let line = allLogLines[i];
        // Add metadata to the chart points so hovering will allow the aggregated log
        // to be scrolled to that line.
        let nodeIndex = line.nodeIndex;
        let lineIndex = line.lineIndex;
        nodeChartLines[nodeIndex].data[lineIndex].allLogLinesIndex = i;
        // Display line
        let el = $($("#line-template").html());

        let socket = line.nodeSocket.length > 0 ? `[${line.nodeSocket}]` : '';
        let level = `${line.logLevel}`;
        let time = `${line.date}`;
        let src = `${line.srcLine}`;
        let text = `${line.text}`;
        let fullLine = eval("`" + lineTemplate + "`"); // don't hurt yourself
        el.find(".text").text(fullLine);
        el.css("background-color", colors[nodeIndex]);
        el.data("lineIndex", i);
        // calculate timings
        if (i > 0) {
            let beforetime = line.time - allLogLines[i-1].time;
            el.find(".beforetime").html(beforetime.toFixed(6) + " seconds");
            if (beforetime > 1) {
                // add longtime indicator to the previous log line
                let lt = document.createElement("div");
                lt.textContent = beforetime + " seconds";
                lt.classList.add("longtime");
                linesEl.children().last().append(lt);
            }
        }
        // events
        el.on("mouseenter", function() {
            showVertLineOnChart(el.data("lineIndex"))
        });
        linesEl.append(el);
    }
}

function showVertLineOnChart(lineIndex) {
    // show line on chart
    let line = allLogLines[lineIndex];
    if (chart && chart.drawPositionLine) {
        let point = nodeChartLines[line.nodeIndex].data[line.lineIndex];
        chart.drawPositionLine(point.x);
    }
}

function scrollLogToTime(t) {
    // find index for this time
    // could change this to binary search
    // but this way takes 100ms for 120K log lines
    // so is fine for now
    let lineIndex = 1;
    for (lineIndex; lineIndex < allLogLines.length; lineIndex++) {
        let thisTime = allLogLines[lineIndex].time;
        let prevTime = allLogLines[lineIndex-1].time;
        if (thisTime > t && prevTime <= t) {
            lineIndex = lineIndex - 1;
            break;
        }
    }
    linesEl.find(":nth-child(" + lineIndex + ")").get(0).scrollIntoView();
}
