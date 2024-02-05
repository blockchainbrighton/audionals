

const baseApiUrl = 'https://api.sordinals.com/api/v1';
  

async function fetchData(url, sectionId, title) {
    console.log(`Fetching data from URL: ${url}`); // Log URL being fetched
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Network response was not ok for ${url}`);
        }
        const data = await response.json();
        console.log(`Data received for ${title}:`, data); // Log fetched data
        displayData(sectionId, title, data);
        // Directly initiate fetching children details if applicable
        if (sectionId === 'inscriptionDetails' && data.inscriptionHash) {
            console.log(`Found inscriptionHash for fetching children: ${data.inscriptionHash}`); // Log found inscriptionHash
            await fetchAndDisplayChildCount(data.inscriptionHash);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        displayData(sectionId, title, { error: error.message });
        console.log(`Failed to fetch or display data for: ${url}`);
    }
}

function adjustIframeSize(iframe) {
    const width = iframe.clientWidth; // Use clientWidth for CSS width
    iframe.style.height = `${width}px`; // Set height equal to current width
}

async function displayData(sectionId, title, data, isParent = true) {
    console.log(`Displaying data for ${title}`); // Log display action
    const section = document.getElementById(sectionId);
    let content = data ? `<h2>${title}</h2><pre>${JSON.stringify(data, null, 2)}</pre>` : `<h2>${title}</h2><p>No data available</p>`;
    section.innerHTML = content;

    if (isParent) {
        const iframe = document.getElementById('inscriptionContentIframe');
        if (data && data.fileUrl) {
            console.log(`Content type: ${data.contentType || 'Unknown'}, URL: ${data.fileUrl}`);
            iframe.style.display = 'block'; // Make sure this is before setting src to ensure dimensions are calculable.

            if (data.contentType && data.contentType.startsWith('image/')) {
                const imageHTML = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body, html {
                                margin: 0;
                                padding: 0;
                                width: 100%;
                                height: 100%;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                background-color: #f0f0f0;
                            }
                            img {
                                width: 100%; /* Scale up to fit the width */
                                height: 100%;
                                max-width: 100%; /* Max width is 100% of the container */
                                max-height: 100%; /* Max height is 100% of the container */
                                object-fit: contain; /* Use 'cover' if you want to fill the area */
                            }
                        </style>
                    </head>
                    <body>
                        <img src="${data.fileUrl}" alt="Inscription Image">
                    </body>
                    </html>
                `;
                const blob = new Blob([imageHTML], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                iframe.src = url;
                console.log(`Iframe set to display image from blob URL: ${url}`);
                iframe.onload = function() {
                    URL.revokeObjectURL(url);
                    adjustIframeSize(iframe); // Adjust size after content is loaded
                };
                iframe.onerror = function() {
                    console.error(`Error loading image content in iframe.`);
                    URL.revokeObjectURL(url);
                };
            } else {
                iframe.src = data.fileUrl;
                console.log(`Setting iframe src to: ${data.fileUrl}`);
                iframe.onload = function() {
                    console.log(`Iframe loaded content from: ${iframe.src}`);
                    adjustIframeSize(iframe); // Adjust size after content is loaded
                };
                iframe.onerror = function() {
                    console.error(`Error loading content in iframe from: ${iframe.src}`);
                };
            }
        } else {
            iframe.style.display = 'none';
            console.log('No content to display, iframe hidden');
        }
    }
}






async function fetchAndDisplayChildCount(parentInscriptionHash) {
    // This URL fetches the count and basic details of children, you might need to adjust it
    // if your API requires different parameters or endpoints to fetch full details of a child.
    const url = `${baseApiUrl}/inscriptions/parent/${parentInscriptionHash}?order=asc&page=1&limit=1`;
    console.log(`Fetching children count and details for inscriptionHash: ${parentInscriptionHash}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Network response was not ok for ${url}`);
        }
        const childData = await response.json();
        console.log(`Children data received:`, childData);

        // Check if children count is greater than 0
        if (childData.count > 0 && childData.data.length > 0) {
            // Update the children count display
            const childCountElement = document.getElementById('childCount');
            if (childCountElement) {
                childCountElement.innerHTML = `PARENT INSCRIPTION - Number of Children: ${childData.count}`;
            } else {
                console.error('Element #childCount not found');
            }
            // Fetch and display full details of the first child
            const firstChild = childData.data[0]; // Assuming this contains enough info to fetch more details
            // Construct the URL to fetch full details of the first child - adjust as needed
            const childDetailsUrl = `${baseApiUrl}/inscriptions/${firstChild.id || firstChild.inscriptionHash}`;
            const childResponse = await fetch(childDetailsUrl);
            if (!childResponse.ok) {
                throw new Error(`Network response was not ok for fetching child details: ${childDetailsUrl}`);
            }
            const childDetailsData = await childResponse.json();
            console.log(`First child details data received:`, childDetailsData);
            // Utilize the displayData function to show the details of the first child
            // You might need to adjust 'childDetails' to match your HTML structure or requirements
            displayData('childDetails', 'First Child Details', childDetailsData, false);
        } else {
            // Hide the children count display if no children found
            document.getElementById('childCount').style.display = 'none';
            document.getElementById('childDetails').innerHTML = 'No children found.';
        }
    } catch (error) {
        console.error('Error fetching child inscriptions:', error);
        document.getElementById('childCount').innerHTML = 'Error fetching children count.';
        document.getElementById('childDetails').innerHTML = `Error: ${error.message}`;
    }
}





function getDetails(type, inputValue = null) {
    console.log(`Getting details for type: ${type}, inputValue: ${inputValue}`); // Log details retrieval action
    let apiUrlPart = '', sectionId = 'inscriptionDetails', title = '';
    if (!inputValue) {
        inputValue = type === 'number' ? document.getElementById('inscriptionNumberInput').value :
                        type === 'hash' ? document.getElementById('inscriptionHashInput').value :
                        type === 'owner' ? document.getElementById('ownerAddressInput').value :
                        document.getElementById('parentIDInput').value;
    }
    switch (type) {
        case 'number':
            apiUrlPart = 'inscriptions';
            title = 'Inscription Details';
            break;
        case 'hash':
            apiUrlPart = 'inscriptions/hash';
            title = 'Inscription Details by Hash';
            break;
        case 'owner':
            apiUrlPart = 'inscriptions/owner';
            sectionId = 'ownedInscriptions';
            title = 'Owned Inscriptions';
            break;
        case 'parent':
            apiUrlPart = 'inscriptions/parent';
            title = 'Child Inscriptions of Parent ID';
            break;
    }
    if (inputValue) {
        const url = `${baseApiUrl}/${apiUrlPart}/${inputValue}`;
        fetchData(url, sectionId, title);
    }
}

function handleKeypress(e, type) {
    if (e.keyCode === 13 || e.key === 'Enter') {
        e.preventDefault(); // Prevent the default action
        getDetails(type);
    }
} 

