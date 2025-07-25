// Global configuration
const S3_BASE_URL = 'https://multivideosummarization-city.s3.us-east-1.amazonaws.com/';
const SEGMENTS_DATA_URL = 'https://sugitomoo.github.io/MVS_city/data/segments/';

// Global state
const segmentData = {};
const selections = {};
let totalDuration = 0;
let selectedDuration = 0;
let videoMetadata = {};
let cityInfo = {};

// Get URL parameters
function getURLParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        area: params.get('area'),
        place: params.get('place'),
        city: params.get('city'),
        videos: params.get('videos') ? params.get('videos').split(',') : [],
        mode: params.get('mode') || 'standalone',
        assignmentId: params.get('assignmentId')
    };
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    const params = getURLParams();
    
    if (!params.area || !params.place || params.videos.length === 0) {
        showError('Missing required parameters. This page should be accessed through AMT interface.');
        return;
    }
    
    cityInfo = {
        area: params.area,
        place: params.place,
        cityName: params.city || params.place,
        videoIds: params.videos,
        mode: params.mode
    };
    
    // Update city title
    const titleElement = document.getElementById('city-title');
    if (titleElement) {
        titleElement.textContent = cityInfo.cityName;
    }
    
    // Load segments data
    loadSegmentsData();
});

// Load segments data from GitHub Pages
async function loadSegmentsData() {
    try {
        const response = await fetch(`${SEGMENTS_DATA_URL}${cityInfo.area}/${cityInfo.place}/${cityInfo.place}_segment.json`);
        if (!response.ok) throw new Error('Failed to load segments data');
        
        const segmentsJson = await response.json();
        
        // Process segments data and create videos
        createVideoElements(segmentsJson);
        initializeSegments(segmentsJson);
        initializeVideos();
    } catch (error) {
        showError('Failed to load segments data: ' + error.message);
    }
}

// ... (他の関数はそのまま維持)

// AMTモードでのメッセージ受信設定（重複を削除して一つに統合）
if (window.location.search.includes('mode=amt')) {
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'save-request') {
            saveResults();
        }
    });
}

// saveResults関数（既存のままでOK）
function saveResults() {
    const percentage = totalDuration > 0 ? (selectedDuration / totalDuration * 100) : 0;
    
    // パーセンテージチェック
    if (percentage < 5 || percentage > 15) {
        const message = `Please select between 5% and 15% of segments.\nCurrent: ${percentage.toFixed(1)}%`;
        
        if (cityInfo.mode === 'amt') {
            // AMTモードの場合は親ウィンドウに通知
            window.parent.postMessage({
                type: 'save-error',
                message: message,
                percentage: percentage
            }, '*');
        }
        alert(message);
        return;
    }
    
    const formattedData = {};
    
    // Format data by YouTube ID
    Object.keys(segmentData).forEach(videoId => {
        const segments = segmentData[videoId];
        if (segments.length === 0) return;
        
        const youtubeId = segments[0].youtubeId;
        formattedData[youtubeId] = {};
        
        segments.forEach(segment => {
            formattedData[youtubeId][`segment_${segment.segmentNumber}`] = 
                selections[segment.id] ? 1 : 0;
        });
    });
    
    const results = {
        city: cityInfo.cityName,
        area: cityInfo.area,
        place: cityInfo.place,
        selections: formattedData,
        total_segments: Object.values(segmentData).reduce((sum, segments) => sum + segments.length, 0),
        selected_segments: Object.keys(selections).length,
        percentage: percentage,
        timestamp: new Date().toISOString()
    };
    
    console.log('Saving results:', results); // デバッグ用
    
    // If in AMT mode, send message to parent
    if (cityInfo.mode === 'amt') {
        window.parent.postMessage({
            type: 'results-saved',
            results: results
        }, '*');
    } else {
        // Standalone mode - download results
        downloadResults(results);
        alert('Results saved successfully!');
    }
}

// ... (残りの関数はそのまま維持)