
var CORE_FIELDS = 5;

var ACCEPTED_NEIGHBORS = {
    'Collector': ['Parser'],
    'Parser': ['Expert', 'Output'],
    'Expert': ['Expert', 'Output'],
    'Output': []
}

var GROUP_LEVELS = {   
    'Collector': 0,
    'Parser': 1,
    'Expert': 2,
    'Output': 3
}

var GROUP_COLORS = {
    'Collector': '#FF0000',
    'Parser': '#00FF00',
    'Expert': '#0000FF',
    'Output': '#FFFF00'    
}

var STARTUP_KEYS = ['group', 'name', 'module', 'description'];

var BOT_ID_REGEX = /^[0-9a-zA-Z-]+$/;

var nodes = {};
var edges = {};
var graph = null;
var bots = {};

var popup = document.getElementById("graph-popUp");
var span = document.getElementById('graph-popUp-title');
var table = document.getElementById("graph-popUp-fields");

window.onresize = function(event) {
    var body = document.getElementsByTagName('body')[0];
    var container = document.getElementsByClassName('container-fluid')[0];
    var header = document.getElementById('page-header');
    var content = document.getElementById('tab-content');
    
    body.style.height = window.innerHeight + "px";
    body.style.overflowY = "hidden";
    
    container.style.height = window.innerHeight + "px";
    container.style.overflowY = "hidden";
    
    header_style = header.currentStyle || window.getComputedStyle(header);
    
    content.style.height = (window.innerHeight - header.offsetHeight - parseInt(header_style.marginTop) - parseInt(header_style.marginBottom) - 20) + "px";
    
    graph.redraw();
}

function convert_edges(edges) {
    var new_edges = [];
    
    for (index in edges) {
        var new_edge = {};
        new_edge.id = edges[index]['id'];
        new_edge.from = edges[index]['from'];
        new_edge.to = edges[index]['to'];
        
        new_edges.push(new_edge);
    }
    
    return new_edges;
}

function convert_nodes(nodes) {
    var new_nodes = [];
    
    for (index in nodes) {
        var new_node = {};
        new_node.id = nodes[index]['id'];
        new_node.label = nodes[index]['id'];
        new_node.group = nodes[index]['group'];
        new_node.title = JSON.stringify(node).replace(/\n/g, '\n<br>').replace(/ /g, "&nbsp;");
        
        new_nodes.push(new_node);
    }
    
    return new_nodes;
}

function disable_file_submit() {
    var file_form = document.getElementById("file-select");
    var graph_row = document.getElementById("graph-row");
    file_form.style.display = 'none';
    graph_row.style.display = 'block';
}

function load_file(elem_id, callback, argument) {
    var file = document.getElementById(elem_id).files[0];
    var file_result = undefined;
    
    var reader = new FileReader();
    reader.onload = (function (event) {
        try {
            obj = JSON.parse(event.target.result);
        } catch(err) {
            callback(event.target.result, argument);
            return;
        }
        
        callback(obj, argument);
    });
    reader.readAsText(file);
}

function verify_files(load_config) {
    if (load_config) {
        if (document.getElementById("startup-file").files[0] && 
            document.getElementById("pipeline-file").files[0] && 
            document.getElementById("runtime-file").files[0]) {
            /* Do nothing */
        } else {
            alert('There are some files missing');
            return;
        }
    }
    if (document.getElementById("bots-file").files[0]) {
        load_file('bots-file', load_bots, load_config);
    } else {
        alert('You need to load at least the bots.conf file.');
        return;
    }

    var body = document.getElementsByTagName('body')[0];
    var container = document.getElementsByClassName('container-fluid')[0];
    var header = document.getElementById('page-header');
    var content = document.getElementById('tab-content');
    
    body.style.height = window.innerHeight + "px";
    body.style.overflowY = "hidden";
    
    container.style.height = window.innerHeight + "px";
    container.style.overflowY = "hidden";
    
    header_style = header.currentStyle || window.getComputedStyle(header);
    
    content.style.height = (window.innerHeight - header.offsetHeight - parseInt(header_style.marginTop) - parseInt(header_style.marginBottom) - 20) + "px";
}

function load_bots(config, load_config) {
    for(bot_group in config) {
        var group = config[bot_group];
        
        available_bots = document.getElementById("available-bots")
        group_title = document.createElement('h5');
        group_title.innerHTML = bot_group;
        group_title.style.borderBottomStyle = "solid";
        group_title.style.borderBottomWidth = "2px";
        group_title.style.borderBottomColor = GROUP_COLORS[bot_group];
        
        //console.dir(group_title.style.borderBottom);
        available_bots.appendChild(group_title);
        
        for (bot_name in group) {
            var bot = group[bot_name];
            
            var bot_title = document.createElement('button');
            bot_title.setAttribute('type', 'button');
            bot_title.setAttribute('class', 'btn btn-link');
            bot_title.setAttribute('data-toggle', 'tooltip');
            bot_title.setAttribute('data-placement', 'right');
            bot_title.setAttribute('title', bot['description']);
            bot_title.setAttribute('onclick', 'fill_bot(undefined, "' + bot_group + '", "' + bot_name + '")');
            bot_title.innerHTML = bot_name;
            
            available_bots.appendChild(bot_title);
            available_bots.appendChild(document.createElement('br'));
            
            if (bots[bot_group] === undefined) {
                bots[bot_group] = {};
            }
            
            bots[bot_group][bot_name] = {
                'name': bot_name,
                'group': bot_group,
                'module': bot['module'],
                'description': bot['description']
            }
            
            for (parameter in bot['parameters']) {
                var value = bot['parameters'][parameter];
                bots[bot_group][bot_name][parameter] = value;
            }
        }
    }
 
    if (load_config) {
        load_file('runtime-file', load_runtime);
    } else {
        disable_file_submit();
        draw();
    }
}

function load_runtime(config) {
    nodes = read_runtime_conf(config);
        
    load_file('startup-file', load_startup);
}

function load_startup(config) {
    nodes = read_startup_conf(config, nodes);   
    
    load_file('pipeline-file', load_pipeline);
}

function load_pipeline(config) {
    edges = read_pipeline_conf(config);
        
    disable_file_submit();
    draw();
}

function fill_bot(id, group, name) {
    var bot = {};
    table.innerHTML = '';
    
    if (id === undefined) {
        bot = bots[group][name];
        
        var new_row = table.insertRow(-1);
        var cell1 = new_row.insertCell(0);
        var cell2 = new_row.insertCell(1);
        
        cell1.setAttribute('class', 'node-key');
        cell2.setAttribute('class', 'node-value');
        
        cell1.innerHTML = 'id';
        var element = document.createElement("input");
        element.setAttribute('type', 'text');
        element.setAttribute('id', 'node-id');
        
        name = bot['name'].replace(/\ /g,'-')
        group = bot['group'].replace(/\ /g,'-')
        default_id = name + "-" + group
        
        element.setAttribute('value', default_id.toLowerCase());
        cell2.appendChild(element);
    }
    else {
        bot = nodes[id];
        var element = document.createElement("input");
        element.setAttribute('type', 'hidden');
        element.setAttribute('id', 'old-id-from-node');
        element.setAttribute('value', id);
        popup.appendChild(element);
    }
    
    for (key in bot) {
        var startup = false;
        for (index in STARTUP_KEYS) {
            if (key == STARTUP_KEYS[index]) {
                startup = true;
            }
        }
        
        element = document.getElementById("node-" + key)
        
        if (!element) {
            new_row = table.insertRow(-1);
            cell1 = new_row.insertCell(0);
            cell2 = new_row.insertCell(1);
            
            cell1.setAttribute('class', 'node-key');
            cell2.setAttribute('class', 'node-value');
            
            cell1.innerHTML = key;
            element = document.createElement("input");
            element.setAttribute('type', 'text');
            
            if (startup) {
                element.setAttribute('disabled', 'true');
            }
            
            element.setAttribute('id', 'node-' + key);
            cell2.appendChild(element);
        }
        
        element.setAttribute('value', bot[key]);    
    }
    
    popup.setAttribute('class', "with-bot");
}

function draw() {
    var connectionCount = [];

    // create a graph
    var container = document.getElementById('mygraph');

    var data = {
        nodes: convert_nodes(nodes),
        edges: convert_edges(edges)
    }
    
    popup = document.getElementById("graph-popUp");
    span = document.getElementById('graph-popUp-title');
    table = document.getElementById("graph-popUp-fields");
    
    document.getElementById('pipeline-conf-content').innerHTML = generate_pipeline_conf(edges);
    document.getElementById('runtime-conf-content').innerHTML = generate_runtime_conf(nodes);
    document.getElementById('startup-conf-content').innerHTML = generate_startup_conf(nodes);
    
    continue_drawing(connectionCount, container, data);
}

function create_form(title, data, callback){
    span.innerHTML = title;
    
    var saveButton = document.getElementById('graph-popUp-save');
    var cancelButton = document.getElementById('graph-popUp-cancel');
    saveButton.onclick = saveData.bind(this,data,callback);
    cancelButton.onclick = clearPopUp.bind();
    
    table.innerHTML="<p>Please select one of the bots on the left</p>";
    popup.style.display = 'block';
    popup.setAttribute('class', "without-bot");
}

function load_form(data){
    for (key in data.custom_fields) {
        new_row = table.insertRow(-1);
        cell1 = new_row.insertCell(0);
        cell2 = new_row.insertCell(1);
        
        cell1.setAttribute('class', 'node-key');
        cell2.setAttribute('class', 'node-value');
        
        cell1.innerHTML = key
        cell2_content = document.createElement("input");
        cell2_content.setAttribute('type', 'text');
        cell2_content.setAttribute('value', data.custom_fields[key]);
        cell2.appendChild(cell2_content);
    }
}

function delete_field(row) {
    table.deleteRow(row.parentElement.parentElement.rowIndex);
}

function clearPopUp() {
    var saveButton = document.getElementById('graph-popUp-save');
    var cancelButton = document.getElementById('graph-popUp-cancel');
    saveButton.onclick = null;
    cancelButton.onclick = null;

    popup.style.display = 'none';
    span.innerHTML = "";

    for (i = table.rows.length-1; i >= 0; i--) { 
        var position = table.rows[i].rowIndex;
        
        if (position >= CORE_FIELDS) {
            table.deleteRow(position);
        } else {
            table.rows[i].setAttribute('value', '');
        }
    }
    
    popup.setAttribute('class', "without-bot");
}

function saveData(data,callback) {
    var idInput = document.getElementById('node-id');
    var groupInput = document.getElementById('node-group');
    var oldIdInput = document.getElementById('old-id-from-node');
    
    if (idInput == undefined && groupInput == undefined) {
        return;
    }
    
    if (oldIdInput != undefined) {
        if (idInput.value != oldIdInput.value) {
            if(!confirm("When you edit an ID what you are doing in fact is to create a clone of the current bot. You will have to delete the old one manually. Proceed with the operation?")) {
                return;
            }
        }
    }
    
    data.id = idInput.value;
    data.group = groupInput.value;
    //data.level = GROUP_LEVELS[data.group];
    
    if (!BOT_ID_REGEX.test(data.id)) {
        alert("Bot ID's can only be composed of numbers, letters and hiphens");
        return;
    }
    
    node = {};
    
    var inputs = document.getElementsByTagName("input");
    for(var i = 0; i < inputs.length; i++) {
        if(inputs[i].id.indexOf('node-') == 0) {
            var key = inputs[i].id.replace('node-', '');
            node[key] = inputs[i].value;
        }
    }
    
    data.label = node['id'];
    
    data.title = JSON.stringify(node).replace(/\n/g, '\n<br>').replace(/ /g, "&nbsp;");
    
    nodes[data.id] = node;
    
    document.getElementById('runtime-conf-content').innerHTML = generate_runtime_conf(nodes);
    document.getElementById('startup-conf-content').innerHTML = generate_startup_conf(nodes);

    clearPopUp();
    callback(data);
}

function continue_drawing(connectionCount, container, data) {
    var options = {
        physics: {
            barnesHut: {
                enabled: false
            }, 
            repulsion: {
                nodeDistance: 200,
                springLength: 200
            }
        },
        edges: {
            length: 500,
            width: 3,
            style: 'arrow',
            arrowScaleFactor: 0.5
        },
        groups: {
            Collector: {
//                shape: 'circle',
                shape: 'box',
                color: GROUP_COLORS['Collector'],
                fontColor: "#FFFFFF"
            },
            Parser: {
//                shape: 'ellipse',
                shape: 'box',
                color: GROUP_COLORS['Parser']
            },
            Expert: {
                shape: 'box',
                color: GROUP_COLORS['Expert'],
                fontColor: "#FFFFFF"
            },
            Output: {
//                shape: 'database',
                shape: 'box',
                color: GROUP_COLORS['Output']
            }
        },
        stabilize: false,
        dataManipulation: true,
        navigation: true,
        onAdd: function(data,callback) {
            create_form("Add Node", data, callback);            
        },
        onEdit: function(data,callback) {
            create_form("Edit Node", data, callback);
            fill_bot(data.id, undefined, undefined);
        },
        onConnect: function(data,callback) {
            if (data.from == data.to) {
                alert('This action would cause an infinite loop');
                return;
            }
            
            for (index in edges) {
                if (edges[index].from == data.from && edges[index].to == data.to) {
                    alert('There is already a link between those bots');
                    return;
                }
            }
            
            var neighbors = ACCEPTED_NEIGHBORS[nodes[data.from].group];
            var available_neighbor = false;
            for (index in neighbors) {
                if (nodes[data.to].group == neighbors[index]) {
                    callback(data);
                    available_neighbor = true;
                }
            }
            
            if (!available_neighbor) {
                if (neighbors.length == 0) {
                    alert("Node type " + nodes[data.from].group + " can't connect to other nodes");
                } else {
                    alert('Node type ' + nodes[data.from].group + ' can only connect to nodes of types: ' + neighbors.join());
                }
                return;
            }

            
            if (edges[data.id] === undefined) {
                edges[data.id] = {};
            }
            
            edges[data.id]={'from': data.from, 'to': data.to};
            
            document.getElementById('pipeline-conf-content').innerHTML = generate_pipeline_conf(edges);
        },
        onDelete: function(data,callback) {
            callback(data);
            
            for (index in data.edges) {
                delete edges[data.edges[index]];
            }
            
            for (index in data.nodes) {
                delete nodes[data.nodes[index]];
            }
            
            document.getElementById('runtime-conf-content').innerHTML = generate_runtime_conf(nodes);
            document.getElementById('startup-conf-content').innerHTML = generate_startup_conf(nodes);
            document.getElementById('pipeline-conf-content').innerHTML = generate_pipeline_conf(edges);
        }
    };
    graph = new vis.Graph(container, data, options);
}

function download(data, name, element, raw) {
    var data_link = 'data:text/plain;charset=utf-8,' + encodeURIComponent(data);
    
    if (raw) {
        window.open(data_link);
    } else {
        element.setAttribute('download', name);
        element.setAttribute('href', data_link);
    }
}

function download_pipeline(element, raw) {
    var data = generate_runtime_conf(nodes);
    data = data.replace(/<br>/g, '').replace(/&nbsp;/g, " ");
    download(data, 'pipeline.conf', element, raw);
}

function download_runtime(element, raw) {
    var data = generate_startup_conf(nodes);
    data = data.replace(/<br>/g, '').replace(/&nbsp;/g, " ");
    download(data, 'runtime.conf', element, raw);
}

function download_startup(element, raw) {
    var data = generate_pipeline_conf(edges);
    data = data.replace(/<br>/g, '').replace(/&nbsp;/g, " ");
    download(data, 'startup.conf', element, raw);
}