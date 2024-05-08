// main.js

const baseApiUrl = 'https://api.sordinals.com/api/v1';

let cachedChildData = null;

async function fetchData(url, sectionId, title) {
    console.log(`Fetching data from URL: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        console.log(`Data received for ${title}:`, data);
        displayInscriptionData(sectionId, title, data);

        document.querySelector('.information-section').style.display = 'flex';
        
        if (sectionId === 'inscriptionDetails' && data.inscriptionHash) {
            console.log(`Found inscriptionHash for fetching children: ${data.inscriptionHash}`);
            await fetchAndDisplayChildren(data.inscriptionHash);
        }
    } catch (error) {
        console.error(`Fetch error for ${title} with URL ${url}:`, error);
        displayInscriptionData(sectionId, title, { error: error.message });
    }
}

function adjustIframeSize(iframe) {
    iframe.style.height = `${iframe.clientWidth}px`;
}

async function displayInscriptionData(sectionId, title, data, isParent = true) {
    console.log(`Displaying data for ${title}`);
    const section = document.getElementById(sectionId);
    section.innerHTML = data ? 
        `<h2>${title}</h2><pre>${formatJsonData(data)}</pre>` : 
        `<h2>${title}</h2><p>No data available</p>`;

    const iframe = document.getElementById('inscriptionContentIframe');
    if (isParent && data && data.fileUrl) {
        iframe.style.display = 'block';
        iframe.src = data.contentType && data.contentType.startsWith('image/') ? createImageContent(data.fileUrl) : data.fileUrl;
        iframe.onload = iframe.onerror = () => adjustIframeSize(iframe);
    } else {
        iframe.style.display = 'none';
    }
}

function createImageContent(fileUrl) {
    const imageHTML = `<html><head><style>body,html{margin:0;padding:0;width:100%;height:100%;display:flex;justify-content:center;align-items:center;background-color:#f0f0f0;}img{width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;}</style></head><body><img src="${fileUrl}" alt="Inscription Image"></body></html>`;
    return URL.createObjectURL(new Blob([imageHTML], { type: 'text/html' }));
}

async function fetchAndDisplayChildren(parentInscriptionHash) {
    let page = 0;
    let hasMore = true;
    let allChildren = [];

    while (hasMore) {
        const url = `${baseApiUrl}/inscriptions/parent/${parentInscriptionHash}?order=desc&sort=id&page=${page}&limit=100`;
        console.log(`Fetching child details for hash: ${parentInscriptionHash} on page ${page}`);
        try {
            const response = await fetch(url);
            console.log(`HTTP Response Status: ${response.status}`);  // Log HTTP status for each request.

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const childData = await response.json();
            console.log(`Received raw JSON data on page ${page}:`, JSON.stringify(childData, null, 2));  // Log the raw JSON data for detailed inspection.

            if (childData.data && childData.data.length > 0) {
                console.log(`Processing ${childData.data.length} children entries on page ${page}`);
                allChildren = allChildren.concat(childData.data);
                processChildData(childData.data);
                page++;  // Move to the next page only if current page had data.
            } else {
                console.log(`No more children found on page ${page}. Ending pagination.`);
                hasMore = false;
            }
        } catch (error) {
            console.error('Error fetching child inscriptions:', error);
            break; // Stop fetching further pages on error.
        }
    }

    console.log(`Total children fetched: ${allChildren.length}`);  // Log the total count of fetched children.
    cachedChildData = allChildren; // Cache all fetched data.
    document.getElementById('childCount').textContent = `Total Number of Children: ${allChildren.length}`;
}



async function downloadChildData() {
    if (!cachedChildData) {
        alert("No child data available to download. Please fetch the data first.");
        return;
    }
    try {
        const csvData = parseDataToCSV(cachedChildData);
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = 'child_list.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error('Error preparing child data for download:', error);
        alert(`Error preparing child data for download: ${error.message}`);
    }
}

function parseDataToCSV(data) {
    const header = 'ID,Hash,Owner\n';
    return header + data.map(child => `${child.id},${child.inscriptionHash},${child.owner}`).join('\n');
}

function formatJsonData(data) {
    const replacements = {
        'id': 'orange',
        'inscriptionHash': 'green',
        'owner': 'red',
        'contentType': 'yellow',
        'fileUrl': 'blue'
    };
    let jsonData = JSON.stringify(data, null, 2);
    for (const key in replacements) {
        jsonData = jsonData.replace(new RegExp(`"${key}": "(.*?)"`, 'g'), `"${key}": "<span style="color:${replacements[key]};">$1</span>"`);
    }
    return jsonData;
}

function processChildData(childData) {
    const childDetails = document.getElementById('childDetails');
    if (Array.isArray(childData) && childData.length) {
        const childrenHtml = childData.map(child => 
            `<div>ID: <span style="color:blue;">${child.id}</span>, 
            Hash: <span style="color:green;">${child.inscriptionHash}</span>, 
            Owner: <span style="color:red;">${child.owner}</span></div>`
        ).join('');
        childDetails.innerHTML = childrenHtml;
    } else {
        childDetails.innerHTML = 'No children found.';
        console.error('Received child data:', childData);  // Log the received data for debugging.
    }
}




async function getDetails(type, inputValue = null) {
    console.log(`Getting details for type: ${type}, inputValue: ${inputValue}`);
    const inputMap = {
        number: 'inscriptionNumberInput',
        hash: 'inscriptionHashInput',
        owner: 'ownerAddressInput',
        parent: 'parentIDInput',
    };
    const apiUrlPartMap = {
        number: 'inscriptions',
        hash: 'inscriptions/hash',
        owner: 'inscriptions/owner',
        parent: 'inscriptions/parent',
    };
    const sectionIdMap = {
        owner: 'ownedInscriptions',
        default: 'inscriptionDetails',
    };
    const titleMap = {
        number: 'Inscription Details',
        hash: 'Inscription Details by Hash',
        owner: 'Owned Inscriptions',
        parent: 'Child Inscriptions of Parent ID',
    };

    inputValue = inputValue || document.getElementById(inputMap[type]).value;
    const sectionId = sectionIdMap[type] || sectionIdMap.default;
    const title = titleMap[type];
    const url = `${baseApiUrl}/${apiUrlPartMap[type]}/${inputValue}`;
    if (inputValue) {
        if (type === 'parent') {
            fetchAndDisplayChildren(inputValue);
        } else {
            fetchData(url, sectionId, title);
        }
    }
}

function handleKeypress(e, type) {
    if (e.key === 'Enter') {
        e.preventDefault();
        getDetails(type);
    }
}
