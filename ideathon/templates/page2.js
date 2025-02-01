    document.addEventListener("DOMContentLoaded", function () {
        var map = L.map('map').setView([28.6139, 77.2090], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        var safetyPoints = [
            { lat: 28.6149, lng: 77.2095, type: 'police' },
            { lat: 28.6169, lng: 77.2110, type: 'hospital' },
            { lat: 28.6189, lng: 77.2125, type: 'light' }
        ];

        const redZones = [
            { name: "Sultanpuri", coordinates: [28.6955, 77.0359] },
            { name: "Nangloi", coordinates: [28.6812, 77.0550] },
            { name: "Rohini", coordinates: [28.7061, 77.1105] }
        ];
    
        redZones.forEach(zone => {
            L.circle(zone.coordinates, {
                color: 'red',
                fillColor: 'red',
                fillOpacity: 0.5, // Adjust opacity as needed
                radius: 500 // Radius in meters - adjust this value
            }).addTo(map).bindPopup(zone.name + " (Red Zone)");
        });

        safetyPoints.forEach(point => {
            let iconUrl = point.type === 'police' ? 'https://cdn-icons-png.flaticon.com/512/2830/2830732.png' :
                        point.type === 'hospital' ? 'https://cdn-icons-png.flaticon.com/512/784/784029.png' :
                        'https://cdn-icons-png.flaticon.com/512/1828/1828665.png';

            let icon = L.icon({ iconUrl, iconSize: [25, 25] });
            L.marker([point.lat, point.lng], { icon }).addTo(map);
        });

        let routingControl, googleRoute;
        const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY'; // Replace with your actual API key

        async function geocodeLocation(query) {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await response.json();
            if (data.length > 0) {
                return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            } else {
                throw new Error('Location not found');
            }
        }

        document.getElementById('findRoute').addEventListener('click', async function () {
            const from = document.getElementById('from').value;
            const to = document.getElementById('to').value;

            if (!from || !to) {
                alert('Please enter both "From" and "To" locations.');
                return;
            }

            try {
                const fromCoords = await geocodeLocation(from);
                const toCoords = await geocodeLocation(to);

                if (routingControl) {
                    map.removeControl(routingControl);
                }
                if (googleRoute) {
                    map.removeLayer(googleRoute);
                }

                routingControl = L.Routing.control({
                    waypoints: [L.latLng(fromCoords.lat, fromCoords.lng), L.latLng(toCoords.lat, toCoords.lng)],
                    routeWhileDragging: true,
                    lineOptions: {
                        styles: [{ color: '#C71585', weight: 5 }] // Dark pink for safest route
                    },
                    router: L.Routing.osrmv1({
                        serviceUrl: 'https://router.project-osrm.org/route/v1',
                        profile: 'driving'
                    })
                }).addTo(map);

                // Fetch Google Maps route via a backend proxy (workaround for CORS)
                const backendProxyUrl = `https://your-backend.com/get-google-route?origin=${from}&destination=${to}`;
                const googleData = await fetch(backendProxyUrl);
                const data = await googleData.json();

                if (data.routes && data.routes.length > 0) {
                    const coords = data.routes[0].overview_polyline.points;
                    googleRoute = L.polyline(decodePolyline(coords), { color: 'blue', weight: 5 }).addTo(map);

                    document.getElementById('compareRoutes').style.display = 'block';
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        });

        function decodePolyline(encoded) {
            let points = [];
            let index = 0, len = encoded.length;
            let lat = 0, lng = 0;

            while (index < len) {
                let b, shift = 0, result = 0;
                do {
                    b = encoded.charCodeAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                } while (b >= 0x20);
                let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
                lat += dlat;

                shift = 0;
                result = 0;
                do {
                    b = encoded.charCodeAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                } while (b >= 0x20);
                let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
                lng += dlng;

                points.push([lat / 1e5, lng / 1e5]);
            }
            return points;
        }

        document.getElementById('compareRoutes').addEventListener('click', function () {
            if (googleRoute) {
                map.addLayer(googleRoute);
            }
        });
    });
