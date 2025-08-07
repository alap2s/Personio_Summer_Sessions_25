document.addEventListener('DOMContentLoaded', () => {
    const stringContainer = document.getElementById('string-container');
    const strings = Array.from(document.querySelectorAll('.string'));
    const cursor = document.querySelector('.cursor');

    let audioContext;
    const noteFrequencies = [
        261.63, // C4
        329.63, // E4
        392.00, // G4
        493.88, // B4
        587.33, // D5
        329.63, // E4
        392.00, // G4
        261.63  // C4
    ];

    function playNote(index) {
        if (!audioContext) return;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.value = noteFrequencies[index];

        const now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.5);

        oscillator.start(now);
        oscillator.stop(now + 0.5);
    }

    const initAudio = () => {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        document.removeEventListener('mousedown', initAudio);
        document.removeEventListener('touchstart', initAudio);
    };
    document.addEventListener('mousedown', initAudio);
    document.addEventListener('touchstart', initAudio);

    const stiffness = 0.1;
    const damping = 0.9;
    const segments = 40;

    strings.forEach((string) => {
        let points = [];
        for (let i = 0; i <= segments; i++) {
            points.push({
                x: i / segments,
                y: 0.5,
                vy: 0,
                originalY: 0.5
            });
        }
        string.points = points;
    });

    function updateStringPath(string) {
        const points = string.points;
        const width = string.offsetWidth;
        const height = string.offsetHeight;

        let d = `M 0 ${points[0].y * height}`;
        for (let i = 1; i < points.length; i++) {
            const p1 = points[i - 1];
            const p2 = points[i];
            const xc = (p1.x + p2.x) * width / 2;
            const yc = (p1.y + p2.y) * height / 2;
            d += ` Q ${p1.x * width} ${p1.y * height}, ${xc} ${yc}`;
        }

        let path = string.querySelector('path');
        if (!path) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.style.position = 'absolute';
            svg.style.left = '0';
            svg.style.top = '0';
            svg.style.overflow = 'visible';
            svg.style.zIndex = getComputedStyle(string).zIndex;

            path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('stroke', getComputedStyle(string).backgroundColor);
            path.setAttribute('stroke-width', height);
            path.setAttribute('fill', 'none');

            string.style.backgroundColor = 'transparent';
            svg.appendChild(path);
            string.appendChild(svg);
        }
        path.setAttribute('d', d);
    }

    function animate() {
        strings.forEach(string => {
            const points = string.points;
            if(!string.isBeingDragged) {
                for (let i = 1; i < segments; i++) {
                    const p = points[i];
                    const force = stiffness * (p.originalY - p.y) - p.vy;
                    p.vy += force;
                    p.vy *= damping;
                    p.y += p.vy;
                }
            }
            updateStringPath(string);
        });
        requestAnimationFrame(animate);
    }

    let isDragging = false;
    let currentlyBentString = null;

    document.addEventListener('mousedown', () => isDragging = true);
    document.addEventListener('mouseup', () => {
        isDragging = false;
        if(currentlyBentString) {
            currentlyBentString.isBeingDragged = false;
            playNote(strings.indexOf(currentlyBentString));
            currentlyBentString = null;
        }
    });

    document.addEventListener('mousemove', e => {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;

        if (isDragging) {
            const targetString = strings.find(string => {
                const rect = string.getBoundingClientRect();
                return e.clientX >= rect.left && e.clientX <= rect.right &&
                       e.clientY >= rect.top && e.clientY <= rect.bottom;
            });

            if (targetString && targetString !== currentlyBentString) {
                if (currentlyBentString) {
                    currentlyBentString.isBeingDragged = false;
                    playNote(strings.indexOf(currentlyBentString));
                }
                currentlyBentString = targetString;
                currentlyBentString.isBeingDragged = true;
            }
            
            if (currentlyBentString) {
                const rect = currentlyBentString.getBoundingClientRect();
                const pullY = (e.clientY - rect.top) / rect.height;
                const pullX = (e.clientX - rect.left) / rect.width;
                
                const centerPoint = Math.round(pullX * segments);
                const points = currentlyBentString.points;

                for (let i = 1; i < segments; i++) {
                    const dist = Math.abs(i - centerPoint);
                    const force = Math.max(0, 1 - dist / (segments / 2)) ** 2;
                    points[i].y = points[i].originalY + (pullY - points[i].originalY) * force;
                }
            }
        }
    });
    
    strings.forEach(updateStringPath);
    animate();
});
