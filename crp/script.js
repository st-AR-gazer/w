document.addEventListener('DOMContentLoaded', function() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const authorSpan = document.getElementById('author');
    const creationDateSpan = document.getElementById('creationDate');
    const descriptionSpan = document.getElementById('description');
    const versionSpan = document.getElementById('version');
    const previewArea = document.getElementById('previewArea');
    const jsonArea = document.getElementById('jsonArea');
    const metadataContainer = document.getElementById('metadata');
    const nameInput = document.getElementById('nameInput');
    let jsonData;
    let currentPreview = 'json';

    dropzone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', function() {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropzone.classList.remove('dragover');

        const file = e.dataTransfer.files[0];
        if (file && file.type === "application/json") {
            const reader = new FileReader();
            reader.onload = function(event) {
                jsonData = JSON.parse(event.target.result);
                displayMetadata(jsonData);
                displayJsonPreview(jsonData);
            };
            reader.readAsText(file);
        } else {
            alert("Please drop a valid JSON file.");
        }
    });

    uploadButton.addEventListener('click', function(e) {
        e.preventDefault();
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        const file = fileInput.files[0];
        if (file && file.type === "application/json") {
            const reader = new FileReader();
            reader.onload = function(event) {
                jsonData = JSON.parse(event.target.result);
                displayMetadata(jsonData);
                displayJsonPreview(jsonData);
            };
            reader.readAsText(file);
        } else {
            alert("Please select a valid JSON file.");
        }
    });

    function displayMetadata(data) {
        const key = Object.keys(data)[0];
        const metadata = data[key].metadata;
        authorSpan.textContent = metadata.author;
        creationDateSpan.textContent = metadata.creationDate;
        descriptionSpan.textContent = metadata.description;
        versionSpan.textContent = metadata.version;
        nameInput.value = key;
        metadataContainer.style.display = 'flex';
    }

    function displayJsonPreview(data) {
        jsonArea.style.display = 'block';
        previewArea.style.display = 'none';
        jsonArea.value = JSON.stringify(data, null, 2);
    }

    nameInput.addEventListener('input', function() {
        if (jsonData) {
            const oldKey = Object.keys(jsonData)[0];
            const newKey = nameInput.value.trim();
            if (newKey && oldKey !== newKey) {
                jsonData[newKey] = jsonData[oldKey];
                delete jsonData[oldKey];
                displayJsonPreview(jsonData);
            }
        }
    });


    function displayCsPreview() {
        if (!jsonData) {
            showNotification('No JSON data available for preview.');
            return;
        }
        
        const key = Object.keys(jsonData)[0];
        const mapData = jsonData[key].map;
        const className = key;
        const functionName = className.replace(/\s+/g, '_');

        let fileContent = generateFileContent(className, functionName);
        
        previewArea.textContent = fileContent;
        previewArea.style.display = 'block';
        jsonArea.style.display = 'none';
    }

    window.copyToClipboard = function() {
        saveChanges();
        const key = Object.keys(jsonData)[0];
        const mapData = jsonData[key].map;
        const className = key;
        const functionName = className.replace(/\s+/g, '_');

        let fileContent = generateFileContent(className, functionName);
        
        navigator.clipboard.writeText(fileContent).then(function() {
            console.log('Copying to clipboard was successful!');
            showNotification('Successfully copied to clipboard!');
        }, function(err) {
            console.error('Could not copy text: ', err);
            showNotification('Failed to copy to clipboard.');
        });
    }

    window.downloadFile = function() {
        saveChanges();
        const key = Object.keys(jsonData)[0];
        const mapData = jsonData[key].map;
        const className = key;
        const functionName = className.replace(/\s+/g, '_');

        let fileContent = generateFileContent(className, functionName);

        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `${className}.cs`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);

        showNotification("File successfully downloaded!");
    }

    function generateFileContent(className, functionName) {
        const mapData = jsonData[Object.keys(jsonData)[0]].map;

        let fileContent = `using GBX.NET;\nusing GBX.NET.Engines.Game;\nclass CRP {\n    static float PI = (float)Math.PI;\n    public static void ${functionName}(Map map) {\n`;

        mapData.forEach(block => {
            if (block.method === 'replace') {
                block.source.forEach(sourceBlock => {
                    fileContent += `        map.replace("${sourceBlock}", new BlockChange(BlockType.Block,"${block.new}"));\n`;
                });
            } else if (block.method === 'delete') {
                block.source.forEach(sourceBlock => {
                    fileContent += `        map.delete("${sourceBlock}");\n`;
                });
            } else if (block.method === 'add') {
                const { x, y, z, direction, block: newBlock, blockUnit } = block;
                if (blockUnit) {
                    fileContent += `        map.place("${newBlock}", new Int3(${x}, ${y}, ${z}), Direction.${direction}, BlockType.Block, BlockUnit.${blockUnit});\n`;
                } else {
                    fileContent += `        map.place("${newBlock}", new Int3(${x}, ${y}, ${z}), Direction.${direction}, BlockType.Block);\n`;
                }
            }
        });

        fileContent += `    }\n}`;

        fileContent += `
class DiagBlockChange : BlockChange{\n
    public DiagBlockChange(BlockType blockType, string model) : base(blockType,model){}\n
    public DiagBlockChange(BlockType blockType, string model, Vec3 absolutePosition) : base(blockType,model,absolutePosition){}\n
    public DiagBlockChange(BlockType blockType, string model, Vec3 absolutePosition, Vec3 pitchYawRoll) : base(blockType,model,absolutePosition,pitchYawRoll){}\n
    public DiagBlockChange(Vec3 absolutePosition) : base(absolutePosition){}\n
    public DiagBlockChange(Vec3 absolutePosition, Vec3 pitchYawRoll) : base(absolutePosition,pitchYawRoll){}\n
\n
    public override void changeBlock(CGameCtnBlock ctnBlock,Block @block){\n
        switch (ctnBlock.Direction){\n
            case Direction.North:\n
                block.relativeOffset(new Vec3(0,0,0));\n
                break;\n
            case Direction.East:\n
                block.relativeOffset(new Vec3(0,0,-32));\n
                break;\n
            case Direction.South:\n
                block.relativeOffset(new Vec3(-64,0,-32));\n
                break;\n
            case Direction.West:\n
                block.relativeOffset(new Vec3(-64,0,0));\n
                break;\n
        }\n
        \n
        if (model != "") {\n
            block.blockType = blockType;\n
            block.model = model;\n
        }\n
        block.relativeOffset(absolutePosition);\n
        block.pitchYawRoll += pitchYawRoll;\n
    }\n
}\n
        `
        return fileContent;
    }

    window.togglePreview = function() {
        if (currentPreview === 'json') {
            displayCsPreview();
            currentPreview = 'cs';
            document.getElementById('toggleButton').textContent = 'Show JSON Preview';
        } else {
            displayJsonPreview(jsonData);
            currentPreview = 'json';
            document.getElementById('toggleButton').textContent = 'Show C# Preview';
        }
    }

    window.saveChanges = function() {
        try {
            jsonData = JSON.parse(jsonArea.value);
            //showNotification('Changes saved successfully.');
        } catch (e) {
            showNotification('Invalid JSON format. Please correct it.');
        }
    }
});
