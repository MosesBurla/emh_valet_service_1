// Global variables
let currentUser = null;
let currentRequest = null;
let socket = null;
let notificationCount = 0;

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initializeSocket();
});

// Authentication functions
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.data;
            document.getElementById('driverName').textContent = currentUser.name;
            loadIncomingRequests();
        } else {
            logout();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        logout();
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

// Socket.io initialization
function initializeSocket() {
    socket = io();

    socket.on('connect', function() {
        console.log('Connected to server');
    });

    socket.on('disconnect', function() {
        console.log('Disconnected from server');
    });

    // Listen for new requests
    socket.on('new-request', function(data) {
        showNotification('New request received');
        loadIncomingRequests();
    });

    // Listen for request accepted by another driver
    socket.on('request-accepted', function(data) {
        if (data.acceptedBy !== currentUser.id) {
            showNotification('A request was accepted by another driver');
            loadIncomingRequests();
        }
    });

    // Listen for request updates
    socket.on('request-updated', function(data) {
        loadIncomingRequests();
    });
}

// API functions
async function loadIncomingRequests() {
    showLoading(true);

    try {
        const response = await fetch('/api/driver/incoming-requests', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayRequests(data.data);
            updateNotificationCount(data.data.length);
        } else {
            showError('Failed to load requests');
        }
    } catch (error) {
        console.error('Error loading requests:', error);
        showError('Error loading requests');
    } finally {
        showLoading(false);
    }
}

async function acceptRequest(requestId) {
    showLoading(true);

    try {
        const response = await fetch(`/api/driver/accept-request/${requestId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            showNotification('Request accepted successfully');
            loadIncomingRequests();
            // Show request details modal
            showRequestDetails(data.data.request);
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to accept request');
        }
    } catch (error) {
        console.error('Error accepting request:', error);
        showError('Error accepting request');
    } finally {
        showLoading(false);
    }
}

async function markParked(requestId) {
    showLoading(true);

    try {
        const response = await fetch(`/api/driver/mark-parked/${requestId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            showNotification('Vehicle marked as parked');
            closeRequestModal();
            loadIncomingRequests();
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to mark as parked');
        }
    } catch (error) {
        console.error('Error marking as parked:', error);
        showError('Error marking as parked');
    } finally {
        showLoading(false);
    }
}

async function markHandedOver(requestId) {
    showLoading(true);

    try {
        const response = await fetch(`/api/driver/mark-handed-over/${requestId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            showNotification('Vehicle handover completed');
            closeRequestModal();
            loadIncomingRequests();
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to complete handover');
        }
    } catch (error) {
        console.error('Error completing handover:', error);
        showError('Error completing handover');
    } finally {
        showLoading(false);
    }
}

// UI functions
function displayRequests(requests) {
    const requestsGrid = document.getElementById('requestsGrid');
    const emptyState = document.getElementById('emptyState');

    if (requests.length === 0) {
        requestsGrid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    requestsGrid.innerHTML = requests.map(request => createRequestCard(request)).join('');
}

function createRequestCard(request) {
    const vehicle = request.vehicleId;
    const requestType = request.type;
    const timeAgo = getTimeAgo(new Date(request.createdAt));

    return `
        <div class="request-card pending" data-request-id="${request._id}">
            <div class="request-header">
                <div>
                    <span class="request-type ${requestType}">
                        <i class="fas fa-${requestType === 'park' ? 'parking' : 'car'}"></i>
                        ${requestType === 'park' ? 'Park' : 'Pickup'}
                    </span>
                    <div class="request-time">${timeAgo}</div>
                </div>
            </div>

            <div class="request-body">
                <div class="vehicle-info">
                    <h4><i class="fas fa-car"></i> Vehicle Information</h4>
                    <div class="vehicle-details">
                        ${vehicle.number ? `<div class="vehicle-detail"><strong>Number:</strong> ${vehicle.number}</div>` : ''}
                        ${vehicle.make && vehicle.make !== 'Unknown' ? `<div class="vehicle-detail"><strong>Make:</strong> ${vehicle.make}</div>` : ''}
                        ${vehicle.model && vehicle.model !== 'Unknown' ? `<div class="vehicle-detail"><strong>Model:</strong> ${vehicle.model}</div>` : ''}
                        ${vehicle.color && vehicle.color !== 'Unknown' ? `<div class="vehicle-detail"><strong>Color:</strong> ${vehicle.color}</div>` : ''}
                        ${vehicle.ownerName && vehicle.ownerName !== 'Unknown' ? `<div class="vehicle-detail"><strong>Owner:</strong> ${vehicle.ownerName}</div>` : ''}
                        ${vehicle.ownerPhone ? `<div class="vehicle-detail"><strong>Phone:</strong> ${vehicle.ownerPhone}</div>` : ''}
                    </div>
                </div>

                ${request.notes ? `
                    <div class="request-notes">
                        <strong>Notes:</strong> ${request.notes}
                    </div>
                ` : ''}

                ${request.locationFrom ? `
                    <div class="location-info">
                        <strong>Pickup Location:</strong><br>
                        Lat: ${request.locationFrom.lat}, Lng: ${request.locationFrom.lng}
                    </div>
                ` : ''}
            </div>

            <div class="request-actions">
                <button class="btn btn-primary" onclick="acceptRequest('${request._id}')">
                    <i class="fas fa-check"></i> Accept Request
                </button>
            </div>
        </div>
    `;
}

function showRequestDetails(request) {
    currentRequest = request;
    const modal = document.getElementById('requestModal');
    const modalBody = document.getElementById('requestModalBody');

    const vehicle = request.vehicleId;
    const requestType = request.type;

    modalBody.innerHTML = `
        <div class="request-detail-section">
            <h4><i class="fas fa-info-circle"></i> Request Information</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <strong>Request ID:</strong> ${request._id}
                </div>
                <div class="detail-item">
                    <strong>Type:</strong> ${requestType === 'park' ? 'Park Vehicle' : 'Pickup Vehicle'}
                </div>
                <div class="detail-item">
                    <strong>Status:</strong> ${request.status}
                </div>
                <div class="detail-item">
                    <strong>Created:</strong> ${new Date(request.createdAt).toLocaleString()}
                </div>
            </div>
        </div>

        <div class="request-detail-section">
            <h4><i class="fas fa-car"></i> Vehicle Details</h4>
            <div class="detail-grid">
                ${vehicle.number ? `<div class="detail-item"><strong>Vehicle Number:</strong> ${vehicle.number}</div>` : ''}
                ${vehicle.make && vehicle.make !== 'Unknown' ? `<div class="detail-item"><strong>Make:</strong> ${vehicle.make}</div>` : ''}
                ${vehicle.model && vehicle.model !== 'Unknown' ? `<div class="detail-item"><strong>Model:</strong> ${vehicle.model}</div>` : ''}
                ${vehicle.color && vehicle.color !== 'Unknown' ? `<div class="detail-item"><strong>Color:</strong> ${vehicle.color}</div>` : ''}
                ${vehicle.ownerName && vehicle.ownerName !== 'Unknown' ? `<div class="detail-item"><strong>Owner Name:</strong> ${vehicle.ownerName}</div>` : ''}
                ${vehicle.ownerPhone ? `<div class="detail-item"><strong>Owner Phone:</strong> ${vehicle.ownerPhone}</div>` : ''}
            </div>
        </div>

        ${request.notes ? `
            <div class="request-detail-section">
                <h4><i class="fas fa-sticky-note"></i> Notes</h4>
                <div class="detail-item">
                    ${request.notes}
                </div>
            </div>
        ` : ''}

        ${request.locationFrom ? `
            <div class="request-detail-section">
                <h4><i class="fas fa-map-marker-alt"></i> Location</h4>
                <div class="detail-item location-info">
                    <strong>Coordinates:</strong><br>
                    Latitude: ${request.locationFrom.lat}<br>
                    Longitude: ${request.locationFrom.lng}
                </div>
            </div>
        ` : ''}

        <div class="request-detail-section">
            <h4><i class="fas fa-cogs"></i> Actions</h4>
            <div class="action-buttons">
                ${requestType === 'park' ? `
                    <button class="btn btn-success" onclick="markParked('${request._id}')">
                        <i class="fas fa-parking"></i> Mark as Parked
                    </button>
                ` : `
                    <button class="btn btn-success" onclick="markHandedOver('${request._id}')">
                        <i class="fas fa-handshake"></i> Mark as Handed Over
                    </button>
                `}
            </div>
        </div>
    `;

    modal.classList.add('active');
}

function closeRequestModal() {
    const modal = document.getElementById('requestModal');
    modal.classList.remove('active');
    currentRequest = null;
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

function showError(message) {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 4000;
        font-weight: 500;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showNotification(message) {
    notificationCount++;
    updateNotificationCount(notificationCount);

    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 4000;
        font-weight: 500;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function updateNotificationCount(count) {
    const notificationCountElement = document.getElementById('notificationCount');
    notificationCountElement.textContent = count;

    if (count > 0) {
        notificationCountElement.style.display = 'block';
    } else {
        notificationCountElement.style.display = 'none';
    }
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

// Event listeners
document.getElementById('notificationBell').addEventListener('click', function() {
    notificationCount = 0;
    updateNotificationCount(0);
    loadIncomingRequests();
});

// Close modal when clicking outside
document.getElementById('requestModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeRequestModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeRequestModal();
    }
    if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        loadIncomingRequests();
    }
});

// Auto-refresh every 30 seconds
setInterval(loadIncomingRequests, 30000);
