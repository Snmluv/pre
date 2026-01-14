/**
 * ============================================================================
 * 필수 변수 및 객체 정의
 * ============================================================================
 * 
 * data.js 로드 이후에 다음 변수들을 정의하고 이 파일을 로드해야 함
 * 
 * [1] nameMap 객체
 *     설명: 실제 데이터 장소명 → HTML 표시 장소명 매핑
 *     예: const nameMap = {
 *           "518민주화운동기록관": "518기록관",
 *           "GS25금남센터시티점": "GS25",
 *         };
 * 
 * [2] northOrder 배열
 *     설명: 금남로 북쪽 장소들 순서 (표시명 사용)
 *     예: const northOrder = ["518기록관", "GS25", "NH농협은행", ...];
 * 
 * [3] southOrder 배열
 *     설명: 금남로 남쪽 장소들 순서 (표시명 사용)
 *     예: const southOrder = ["투썸플레이스", "흥국화재빌딩", ...];
 * 
 * [4] placeDetails 객체
 *     설명: 각 장소의 항목별 상세 정보
 *     구조: {
 *       "장소명": {
 *         "유효폭": [{ "상태": "양호|개선(장기)|긴급조치", "설명": "" }, ...],
 *         "기울기/단차": [{ "상태": "", "설명": "" }, ...],
 *         "점자블록": [{ "상태": "", "설명": "" }, ...],
 *         "포장상태": [{ "상태": "", "설명": "" }, ...],
 *         "건물진입로": [{ "상태": "", "설명": "" }, ...]
 *       }
 *     }
 * 
 * ============================================================================
 */

    let currentPlace = null;
    let sortedPlaces = [];

        function findPlaceByDisplayName(displayName) { // [1] nameMap 사용 - 표시명으로 실제 데이터 찾기
            for (const [original, mapped] of Object.entries(nameMap)) {
                if (mapped === displayName) {
                    return data.places.find(p => p.장소 === original);
                }
            }
            return data.places.find(p => p.장소 === displayName);
        }
        
        let currentFilteredPlaces = []; // [4] Status Grid 클릭 시 필터링된 장소 목록
        let currentFilterIndex = 0;
        
        function filterByStatus(status) { // [4] Status Grid 클릭 → 상태별 장소 필터링
            let filteredPlaces = data.places.filter(place => {
                if (status === '긴급조치') {
                    return place.상태.includes('긴급');
                } else if (status === '개선(장기)') {
                    return place.상태.includes('개선');
                } else {
                    return place.상태 === status;
                }
            });
            
            if (filteredPlaces.length === 0) {
                alert(`${status} 상태의 장소가 없습니다.`);
                return;
            }
            
            currentFilteredPlaces = filteredPlaces;
            currentFilterIndex = 0;
            
            document.querySelectorAll('.place-btn').forEach(btn => {
                const isFiltered = filteredPlaces.some(p => p.장소 === btn.dataset.placeName);
                btn.classList.toggle('active', isFiltered);
            });
            
            const avgPlace = calculateAverageForPlaces(filteredPlaces, status);
            currentPlace = avgPlace;
            
            updateDetailInfoForMultiplePlaces(filteredPlaces, status);
            updateDeviationChart();
            
            document.querySelector('.place-selector').scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            const header = document.querySelector('.place-selector h2');
            if (header) {
                header.textContent = `장소 선택`;
            }
        }
        
        function calculateAverageForPlaces(places, status) {
            const validWidth = places.filter(p => p.유효폭.값 !== null);
            const validSlope = places.filter(p => p.기울기.값 !== null);
            const validStep = places.filter(p => p.단차.값 !== null);
            
            const avgWidth = validWidth.length > 0 
                ? Math.round((validWidth.reduce((sum, p) => sum + p.유효폭.값, 0) / validWidth.length) * 100) / 100
                : null;
            const avgSlope = validSlope.length > 0
                ? Math.round((validSlope.reduce((sum, p) => sum + p.기울기.값, 0) / validSlope.length) * 100) / 100
                : null;
            const avgStep = validStep.length > 0
                ? Math.round((validStep.reduce((sum, p) => sum + p.단차.값, 0) / validStep.length) * 100) / 100
                : null;
            
            const standards = data.standards;
            
            return {
                장소: `${status} (${places.length}개 평균)`,
                상태: status,
                유효폭: {
                    값: avgWidth,
                    편차: avgWidth !== null ? Math.round((avgWidth - standards.유효폭_m) * 100) / 100 : null,
                    점수: null
                },
                기울기: {
                    값: avgSlope,
                    편차: avgSlope !== null ? Math.round((avgSlope - standards.기울기_도) * 100) / 100 : null,
                    점수: null
                },
                단차: {
                    값: avgStep,
                    편차: avgStep !== null ? Math.round((avgStep - standards.단차_cm) * 100) / 100 : null,
                    점수: null
                }
            };
        }
        
        function updateDetailInfoForMultiplePlaces(places, status) {
            const container = document.getElementById('detailInfo');
            
            const statusColor = status === '양호' ? '#C8FFC8' : (status.includes('긴급') ? '#FFC8C8' : '#FFFF96');
            
            let html = `
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f6f8fa; border-left: 4px solid ${statusColor};">
                    <div style="font-size: 1rem; font-weight: 700; color: #1a1a1a; margin-bottom: 0.5rem;">
                        ${status} - ${places.length}개 장소 평균
                    </div>
                    <div style="font-size: 0.875rem; color: #6a737d; line-height: 1.6;">
                        ${places.map(p => p.장소).join(', ')}
                    </div>
                </div>
            `;
            
            const allDetails = places.map(p => {
                const details = placeDetails[p.장소];
                return { name: p.장소, details };
            }).filter(item => item.details);
            
            if (allDetails.length > 0) {
                html += '<div class="detail-category">';
                html += '<div class="detail-category-title">주요 개선 필요 항목</div>';
                
                let issueCount = 0;
                allDetails.forEach(item => {
                    const issues = [];
                    
                    item.details['포장상태'].forEach(i => {
                        if (i.상태 !== '양호') issues.push({ cat: '포장', text: i.설명, status: i.상태 });
                    });
                    item.details['점자블록'].forEach(i => {
                        if (i.상태 !== '양호') issues.push({ cat: '점자', text: i.설명, status: i.상태 });
                    });
                    item.details['건물진입로'].forEach(i => {
                        if (i.상태 !== '양호') issues.push({ cat: '진입', text: i.설명, status: i.상태 });
                    });
                    
                    if (issues.length > 0) {
                        issues.forEach(issue => {
                            const itemStatusClass = issue.status === '양호' ? 'good' : (issue.status.includes('긴급') ? 'urgent' : 'mid');
                            html += `
                                <div class="detail-item ${itemStatusClass}" style="margin-bottom: 0.5rem;">
                                    <div class="detail-item-status">${item.name}</div>
                                    <div class="detail-item-text">[${issue.cat}] ${issue.text}</div>
                                </div>
                            `;
                            issueCount++;
                        });
                    }
                });
                
                if (issueCount === 0) {
                    html += '<div class="detail-empty">개선이 필요한 항목이 없습니다.</div>';
                }
                
                html += '</div>';
            } else {
                html += '<div class="detail-empty">상세 정보가 없습니다.</div>';
            }
            
            container.innerHTML = html;
        }
        
        
        // 상태를 숫자로 변환 (정렬용)
        function statusToNum(status) {
            if (!status) return 0;
            if (status === '양호') return 1;
            if (status.includes('개선')) return 2;
            if (status.includes('긴급')) return 3;
            return 0;
        }
        
        // 특정 항목의 최악 상태 가져오기
        function getWorstStatus(place, metricKey, filter = null) {
            const details = placeDetails[place.장소];
            if (!details || !details[metricKey]) return 0;
            
            let items = details[metricKey];
            
            // 필터 적용
            if (filter === 'slope') {
                items = items.filter(item => item.설명.includes('기울기'));
            } else if (filter === 'step') {
                items = items.filter(item => item.설명.includes('단차'));
            }
            
            if (items.length === 0) return 0;
            
            // 가장 나쁜 상태 찾기
            let worst = 0;
            items.forEach(item => {
                const num = statusToNum(item.상태);
                if (num > worst) worst = num;
            });
            
            return worst;
        }
        
        // 장소의 전체 최악 상태 가져오기
        function getPlaceWorstStatus(placeName) {
            const details = placeDetails[placeName];
            if (!details) return '양호';
            
            const allItems = [
                ...(details['유효폭'] || []),
                ...(details['기울기/단차'] || []),
                ...(details['점자블록'] || []),
                ...(details['포장상태'] || []),
                ...(details['건물진입로'] || [])
            ];
            
            const hasUrgent = allItems.some(item => item.상태.includes('긴급'));
            const hasMid = allItems.some(item => item.상태.includes('개선'));
            
            if (hasUrgent) return '긴급조치';
            if (hasMid) return '개선(장기)';
            return '양호';
        }
        
        function updateStatusStats() { // [4] Status Grid 수치 업데이트 - 상태별 장소 개수 계산
            const statusCounts = { // [4] 상태별 개수 저장
                '양호': 0,
                '개선(장기)': 0,
                '긴급조치': 0
            };
            
            data.places.forEach(place => { // [4] 각 장소의 상태 확인해서 개수 증가
                const status = place.상태;
                if (statusCounts.hasOwnProperty(status)) {
                    statusCounts[status]++;
                } else if (status.includes('긴급')) {
                    statusCounts['긴급조치']++;
                } else if (status.includes('개선')) {
                    statusCounts['개선(장기)']++;
                } else {
                    statusCounts['양호']++;
                }
            });
            
            document.getElementById('statusGood').textContent = statusCounts['양호']; // [4] 양호 장소 개수 표시
            document.getElementById('statusMid').textContent = statusCounts['개선(장기)']; // [4] 개선(장기) 장소 개수 표시
            document.getElementById('statusUrgent').textContent = statusCounts['긴급조치']; // [4] 긴급조치 장소 개수 표시
        }
        
        function drawHeatmap(sortBy = 'none') { // [3] Heatmap Table 생성 - placeDetails 사용
            const table = document.getElementById('heatmapTable'); // [3] Heatmap 테이블 요소
            let places = [...data.places]; // [3] 모든 장소 복사
            
            // [3] 정렬 기준별 장소 정렬
            if (sortBy === 'width') { // [3] 유효폭 기준 정렬
                places.sort((a, b) => {
                    const aWorst = getWorstStatus(a, '유효폭');
                    const bWorst = getWorstStatus(b, '유효폭');
                    if (bWorst !== aWorst) return bWorst - aWorst;  // 긴급 > 개선 > 양호
                    return a.장소.localeCompare(b.장소, 'ko');  // 같으면 가나다순
                });
            } else if (sortBy === 'slope') { // [3] 기울기 기준 정렬
                places.sort((a, b) => {
                    const aWorst = getWorstStatus(a, '기울기/단차', 'slope');
                    const bWorst = getWorstStatus(b, '기울기/단차', 'slope');
                    if (bWorst !== aWorst) return bWorst - aWorst;
                    return a.장소.localeCompare(b.장소, 'ko');
                });
            } else if (sortBy === 'step') { // [3] 단차 기준 정렬
                places.sort((a, b) => {
                    const aWorst = getWorstStatus(a, '기울기/단차', 'step');
                    const bWorst = getWorstStatus(b, '기울기/단차', 'step');
                    if (bWorst !== aWorst) return bWorst - aWorst;
                    return a.장소.localeCompare(b.장소, 'ko');
                });
            } else if (sortBy === 'tactile') { // [3] 점자블록 기준 정렬
                places.sort((a, b) => {
                    const aWorst = getWorstStatus(a, '점자블록');
                    const bWorst = getWorstStatus(b, '점자블록');
                    if (bWorst !== aWorst) return bWorst - aWorst;
                    return a.장소.localeCompare(b.장소, 'ko');
                });
            } else if (sortBy === 'pavement') { // [3] 포장상태 기준 정렬
                places.sort((a, b) => {
                    const aWorst = getWorstStatus(a, '포장상태');
                    const bWorst = getWorstStatus(b, '포장상태');
                    if (bWorst !== aWorst) return bWorst - aWorst;
                    return a.장소.localeCompare(b.장소, 'ko');
                });
            } else if (sortBy === 'entrance') { // [3] 건물진입로 기준 정렬
                places.sort((a, b) => {
                    const aWorst = getWorstStatus(a, '건물진입로');
                    const bWorst = getWorstStatus(b, '건물진입로');
                    if (bWorst !== aWorst) return bWorst - aWorst;
                    return a.장소.localeCompare(b.장소, 'ko');
                });
            } else { // [3] 기본: 가나다순 정렬
                places.sort((a, b) => a.장소.localeCompare(b.장소, 'ko'));
            }
            
            sortedPlaces = places; // [3] 정렬된 장소 저장
            
            // [3] 헤더 행 생성
            let html = '<thead><tr><th></th>';
            places.forEach(place => { // [3] 각 장소 이름 (세로)
                html += `<th style="writing-mode: vertical-rl; text-orientation: mixed; height: 150px;">${place.장소}</th>`;
            });
            html += '</tr></thead><tbody>';
            
            // [3] Heatmap 행: 유효폭, 기울기, 단차, 점자블록, 포장상태, 건물진입로
            const metrics = [
                { label: '유효폭', key: '유효폭' },
                { label: '기울기', key: '기울기/단차', filter: 'slope' },
                { label: '단차', key: '기울기/단차', filter: 'step' },
                { label: '점자블록', key: '점자블록' },
                { label: '포장상태', key: '포장상태' },
                { label: '건물진입로', key: '건물진입로' }
            ];
            
            metrics.forEach(metric => { // [3] 각 항목별 행 생성
                html += `<tr><td>${metric.label}</td>`;
                
                places.forEach(place => { // [3] 각 장소의 항목 상태 표시
                    const details = placeDetails[place.장소]; // [3] placeDetails에서 장소 정보 조회
                    let items = details && details[metric.key] ? details[metric.key] : []; // [3] 해당 항목의 상태 목록
                    
                    if (metric.filter === 'slope') { // [3] 기울기만 필터
                        items = items.filter(item => item.설명.includes('기울기'));
                    } else if (metric.filter === 'step') { // [3] 단차만 필터
                        items = items.filter(item => item.설명.includes('단차'));
                    }
                    
                    html += `<td onclick="selectPlaceFromTable('${place.장소}')"><div class="dot-cell">`;
                    
                    if (items.length === 0) { // [3] 데이터 없을 때
                        html += '<span class="table-dot none" data-status="측정안함" data-desc="해당 항목의 측정 데이터가 없습니다."></span>';
                    } else { // [3] 각 상태별 동그라미 표시
                        items.forEach(item => {
                            const cls = item.상태 === '양호' ? 'good' : item.상태.includes('긴급') ? 'urgent' : 'mid'; // [3] 상태별 색상 클래스
                            html += `<span class="table-dot ${cls}" data-status="${item.상태}" data-desc="${item.설명.replace(/\"/g, '&quot;')}"></span>`;
                        });
                    }
                    
                    html += '</div></td>';
                });
                
                html += '</tr>';
            });
            
            html += '</tbody>';
            table.innerHTML = html;
            
            // 툴팁 이벤트 리스너 추가
            setTimeout(() => {
                const tooltip = document.getElementById('dotTooltip');
                if (!tooltip) return;
                const dots = table.querySelectorAll('.table-dot');
                dots.forEach(dot => {
                    dot.addEventListener('mouseenter', (e) => {
                    const status = e.target.dataset.status;
                    const desc = e.target.dataset.desc;
                    
                    if (!status || !desc) return;
                    
                    let value = '';
                    
                    if (desc.includes('출입문')) {
                        value = desc;
                    }
                    else if (desc.includes('점자블록')) {
                        value = desc;
                    }
                    else if (desc.includes('포장') || desc.includes('상하유격') || desc.includes('보도블럭')) {
                        value = desc;
                    }
                    else if (desc.match(/유효폭이\s*([\d.]+)m/)) {
                        const m = desc.match(/유효폭이\s*([\d.]+)m/);
                        value = m[1] + 'm';
                    }
                    else if (desc.includes('기울기')) {
                        const m = desc.match(/기울기가?\s*([\d.]+)도/);
                        if (m) value = m[1] + '°';
                    }
                    else if (desc.includes('단차')) {
                        const m = desc.match(/단차가?\s*([\d.]+)cm/);
                        if (m) value = m[1] + 'cm';
                    }
                    else {
                        value = desc;
                    }
                    
                    if (!value) value = status;
                    
                    tooltip.innerHTML = `<strong>${status}</strong>: ${value}`;
                    
                    tooltip.style.display = 'block';
                    tooltip.style.left = (e.clientX + 15) + 'px';
                    tooltip.style.top = (e.clientY + 15) + 'px';
                });
                
                dot.addEventListener('mousemove', (e) => {
                    tooltip.style.left = (e.clientX + 15) + 'px';
                    tooltip.style.top = (e.clientY + 15) + 'px';
                });
                
                dot.addEventListener('mouseleave', () => {
                    tooltip.style.display = 'none';
                });
            });
            }, 100);
        }
        
        function selectPlaceFromTable(placeName) {
            const place = sortedPlaces.find(p => p.장소 === placeName);
            if (place) {
                selectPlaceByOriginalName(place.장소);
            }
        }
        
        function initPlaceButtons() { // [5] Place Selector 초기화 - northOrder, southOrder 사용
            const northContainer = document.getElementById('north-places'); // [5] 북쪽 장소 컨테이너
            const southContainer = document.getElementById('south-places'); // [5] 남쪽 장소 컨테이너
            
            northOrder.forEach(displayName => { // [5] northOrder 순서대로 북쪽 버튼 생성
                const place = findPlaceByDisplayName(displayName);
                if (place) {
                    const btn = document.createElement('button');
                    btn.className = 'place-btn';
                    btn.textContent = displayName; // [5] 표시명으로 버튼 텍스트 설정
                    btn.dataset.placeName = place.장소;
                    btn.onclick = () => selectPlaceByOriginalName(place.장소);
                    northContainer.appendChild(btn);
                }
            });
            
            southOrder.forEach(displayName => { // [5] southOrder 순서대로 남쪽 버튼 생성
                const place = findPlaceByDisplayName(displayName);
                if (place) {
                    const btn = document.createElement('button');
                    btn.className = 'place-btn';
                    btn.textContent = displayName; // [5] 표시명으로 버튼 텍스트 설정
                    btn.dataset.placeName = place.장소;
                    btn.onclick = () => selectPlaceByOriginalName(place.장소);
                    southContainer.appendChild(btn);
                }
            });
            
            setTimeout(() => { // [5] 레이아웃 계산 후 버튼 패딩 조정
                const northWidth = northContainer.scrollWidth;
                const southButtons = southContainer.querySelectorAll('.place-btn');
                
                if (southButtons.length > 0) {
                    let currentSouthWidth = southContainer.scrollWidth;
                    const gap = 8;
                    const totalGaps = (southButtons.length - 1) * gap;
                    
                    let contentWidthSum = 0;
                    southButtons.forEach(btn => {
                        const style = window.getComputedStyle(btn);
                        const paddingLeft = parseFloat(style.paddingLeft);
                        const paddingRight = parseFloat(style.paddingRight);
                        contentWidthSum += btn.offsetWidth - paddingLeft - paddingRight;
                    });
                    
                    const containerPadding = 32;
                    const availableWidth = northWidth - containerPadding - totalGaps - contentWidthSum;
                    const paddingPerButton = availableWidth / (southButtons.length * 2);
                    
                    southButtons.forEach(btn => {
                        btn.style.paddingLeft = `${paddingPerButton}px`;
                        btn.style.paddingRight = `${paddingPerButton}px`;
                    });
                }
            }, 100);
            
            const firstPlace = findPlaceByDisplayName(northOrder[0]); // [5] 첫 번째 장소 자동 선택
            if (firstPlace) selectPlaceByOriginalName(firstPlace.장소);
        }
        
        function selectPlaceByOriginalName(originalName) { // [5] 장소 선택 → 상세 정보 업데이트
            const place = data.places.find(p => p.장소 === originalName);
            if (!place) return;
            
            currentPlace = place; // [5] 현재 선택 장소 저장
            document.querySelectorAll('.place-btn').forEach(btn => { // [5] 선택된 버튼 활성화 표시
                btn.classList.toggle('active', btn.dataset.placeName === originalName);
            });
            updateDetailInfo();
            updateDeviationChart();
        }
        
        function updateDetailInfo() {
            const container = document.getElementById('detailInfo');
            const placeName = currentPlace.장소;
            
            const details = placeDetails[placeName];
            
            if (!details) {
                container.innerHTML = `
                    <div style="color: #6a737d; text-align: center; padding: 2rem;">
                        <strong>${placeName}</strong>에 대한 상세 정보가 없습니다.
                    </div>
                `;
                return;
            }
            
            let html = '';
            
            if (details['포장상태'] && details['포장상태'].length > 0) {
                html += '<div class="detail-category">';
                html += '<div class="detail-category-title">포장상태</div>';
                details['포장상태'].forEach(item => {
                    const statusClass = item.상태 === '양호' ? 'good' : (item.상태.includes('긴급') ? 'urgent' : 'mid');
                    const statusText = item.상태 === '양호' ? '양호' : (item.상태.includes('긴급') ? '긴급' : '개선');
                    html += `
                        <div class="detail-item ${statusClass}">
                            <div class="detail-item-status">${statusText}</div>
                            <div class="detail-item-text">${item.설명}</div>
                        </div>
                    `;
                });
                html += '</div>';
            }
            
            if (details['점자블록'] && details['점자블록'].length > 0) {
                html += '<div class="detail-category">';
                html += '<div class="detail-category-title">점자블록</div>';
                const uniqueItems = {};
                details['점자블록'].forEach(item => {
                    const key = item.설명 + item.상태;
                    if (!uniqueItems[key]) {
                        uniqueItems[key] = item;
                    }
                });
                Object.values(uniqueItems).forEach(item => {
                    const statusClass = item.상태 === '양호' ? 'good' : (item.상태.includes('긴급') ? 'urgent' : 'mid');
                    const statusText = item.상태 === '양호' ? '양호' : (item.상태.includes('긴급') ? '긴급' : '개선');
                    html += `
                        <div class="detail-item ${statusClass}">
                            <div class="detail-item-status">${statusText}</div>
                            <div class="detail-item-text">${item.설명}</div>
                        </div>
                    `;
                });
                html += '</div>';
            }
            
            if (details['건물진입로'] && details['건물진입로'].length > 0) {
                html += '<div class="detail-category">';
                html += '<div class="detail-category-title">건물 진입로</div>';
                details['건물진입로'].forEach(item => {
                    const statusClass = item.상태 === '양호' ? 'good' : (item.상태.includes('긴급') ? 'urgent' : 'mid');
                    const statusText = item.상태 === '양호' ? '양호' : (item.상태.includes('긴급') ? '긴급' : '개선');
                    html += `
                        <div class="detail-item ${statusClass}">
                            <div class="detail-item-status">${statusText}</div>
                            <div class="detail-item-text">${item.설명}</div>
                        </div>
                    `;
                });
                html += '</div>';
            }
            
            if (html === '') {
                html = '<div class="detail-empty">등록된 상세 정보가 없습니다.</div>';
            }
            
            container.innerHTML = html;
        }
        
        
        function updateDeviationChart() {
            const container = document.getElementById('deviationBars');
            
            // 상태별 현황(평균)인 경우 비우고 종료
            if (currentPlace && currentPlace.장소 && currentPlace.장소.includes('평균')) {
                container.innerHTML = '';
                return;
            }
            
            container.innerHTML = '';
            
            const metrics = [
                { name: '유효폭', value: currentPlace.유효폭.값, deviation: currentPlace.유효폭.편차, unit: 'm', max: 5, type: 'width' },
                { name: '기울기', value: currentPlace.기울기.값, deviation: currentPlace.기울기.편차, unit: '°', max: 10, type: 'slope' },
                { name: '단차', value: currentPlace.단차.값, deviation: currentPlace.단차.편차, unit: 'cm', max: 20, type: 'step' }
            ];
            
            metrics.forEach(metric => {
                if (metric.value === null) return;
                
                const item = document.createElement('div');
                item.className = 'deviation-item';
                
                // -0과 0을 모두 처리
                const isZero = metric.deviation === 0 || metric.deviation === -0 || Math.abs(metric.deviation) < 0.001;
                const isPositive = metric.deviation > 0;
                const isNegative = metric.deviation < 0;
                
                // 편차가 0이면 막대를 표시하지 않음
                if (isZero) {
                    item.innerHTML = `
                        <div class="deviation-label">
                            <span class="metric-name">${metric.name}</span>
                            <span class="metric-value">실제: ${metric.value.toFixed(2)}${metric.unit} | 편차: 0.00${metric.unit}</span>
                        </div>
                        <div class="deviation-bar-wrapper">
                            <div class="deviation-baseline"></div>
                            <div style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-weight: 700; font-size: 1.1rem; color: #1a1a1a; background: #fff; padding: 0.25rem 0.75rem; border: 2px solid #1a1a1a;">
                                0.0
                            </div>
                        </div>
                    `;
                    container.appendChild(item);
                    return;
                }
                
                const absDeviation = Math.abs(metric.deviation);
                const percentage = Math.max(8, Math.min((absDeviation / metric.max) * 50, 50));
                
                // 막대 클래스 결정
                // 유효폭: +편차 = 오른쪽 초록, -편차 = 왼쪽 빨강
                // 기울기/단차: +편차 = 오른쪽 빨강, -편차 = 왼쪽 초록
                let barClass;
                if (metric.type === 'width') {
                    barClass = isPositive ? 'positive' : 'negative';
                } else {
                    // 기울기/단차
                    if (isPositive) {
                        barClass = 'slope-exceed';  // 오른쪽 빨강
                    } else {
                        barClass = 'slope-good';    // 왼쪽 초록
                    }
                }
                
                const isLarge = percentage > 35;
                let valueStyle;
                if (isPositive) {
                    valueStyle = isLarge ? 'right: 8px;' : 'left: 100%; margin-left: 8px;';
                } else {
                    valueStyle = isLarge ? 'left: 8px;' : 'right: 100%; margin-right: 8px;';
                }
                
                item.innerHTML = `
                    <div class="deviation-label">
                        <span class="metric-name">${metric.name}</span>
                        <span class="metric-value">실제: ${metric.value.toFixed(2)}${metric.unit} | 편차: ${metric.deviation > 0 ? '+' : ''}${metric.deviation.toFixed(2)}${metric.unit}</span>
                    </div>
                    <div class="deviation-bar-wrapper">
                        <div class="deviation-baseline"></div>
                        <div class="deviation-bar ${barClass}" 
                             style="width: ${percentage}%;">
                            <div class="deviation-value" style="${valueStyle}">
                                ${isPositive ? '+' : ''}${metric.deviation.toFixed(1)}
                            </div>
                        </div>
                    </div>
                `;
                
                container.appendChild(item);
            });
        }
        
        
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const activeBtn = document.querySelector('.sort-btn.active');
                if (activeBtn) {
                    drawHeatmap(activeBtn.dataset.sort);
                }
            }, 200);
        });
        
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                drawHeatmap(btn.dataset.sort);
            });
        });
        
        drawPlotlyCharts();
        updateStatusStats();
        drawHeatmap();
        initPlaceButtons();
    
        
        function drawPlotlyCharts() { // [1][2] Sunburst & Box Plot 차트 생성
            console.log('Drawing Plotly charts...');
            const places = data.places;
            
            const sbLabels = [
    "전체",
    "양호", "건물 진입로", "기울기/단차", "유효폭", "점자블록", "포장상태",
    "개선(장기)", "건물 진입로 ", "기울기/단차 ", "점자블록 ",
    "긴급조치", "포장상태 ", "유효폭 ", "기울기/단차  ", "점자블록  ", "건물 진입로  "
];

const sbParents = [
    "",
    "전체", "양호", "양호", "양호", "양호", "양호",
    "전체", "개선(장기)", "개선(장기)", "개선(장기)",
    "전체", "긴급조치", "긴급조치", "긴급조치", "긴급조치", "긴급조치"
];

const sbValues = [
    165,        // 전체 (113+34+18)
    113,        // 양호
    19, 13, 56, 23, 2,  // 양호의 하위: 건물진입로, 기울기/단차, 유효폭, 점자블록, 포장상태
    33,         // 개선(장기)
    23, 8, 2,        // 개선(장기)의 하위: 건물진입로, 기울기/단차, 점자블록
    18,         // 긴급조치
    7, 6, 2, 2, 1       // 긴급조치의 하위: 포장상태, 유효폭, 기울기/단차, 점자블록, 건물진입로
];
            
            const statusColors = {
                "양호": "rgb(200, 255, 200)",
                "개선(장기)": "rgb(255, 255, 150)",
                "긴급조치": "rgb(255, 200, 200)",
            };
            
            const sbColors = sbLabels.map((label, i) => {
                const parent = sbParents[i];
                if (label === "전체") return "#ffffff";
                if (statusColors[label]) return statusColors[label];
                if (statusColors[parent]) return statusColors[parent];
                return "#eeeeee";
            });
            
            const sbCustomData = ["", "", "518민주화운동기록관<br>GS25금남센터시티점<br>NH투자증권<br>YMCA<br>노스페이스<br>센스플라워<br>전일빌딩<br>커피리나<br>토탈공인중개사사무소<br>투썸플레이스<br>풀덤<br>흥국화재빌딩", "GS25금남센터시티점<br>SKT<br>TUVA<br>금고제작소<br>금남로공원<br>아성빌딩<br>우리은행<br>토탈공인중개사사무소<br>투썸플레이스<br>흥국화재빌딩", "518민주화운동기록관<br>GS25금남센터시티점<br>NH농협은행<br>NH투자증권<br>SC제일은행<br>SKT<br>SK브로드밴드<br>TUVA<br>YMCA<br>금남로공원<br>네이버스퀘어광주<br>노스페이스<br>루이까스텔<br>무등빌딩<br>센스플라워<br>아성빌딩<br>아이스마트<br>우리은행<br>유광빌딩<br>전일빌딩<br>천하주차장<br>토탈공인중개사사무소<br>투썸플레이스<br>하나은행<br>한국투자증권<br>흥국화재빌딩", "518민주화운동기록관<br>NH투자증권<br>SC제일은행<br>SKT<br>YMCA<br>금남로공원<br>네이버스퀘어광주<br>노스페이스<br>무등빌딩<br>엘리베이터<br>우리은행<br>전일빌딩<br>천하주차장<br>투썸플레이스<br>하나은행<br>한국투자증권<br>흥국화재빌딩", "SC제일은행<br>전일빌딩", "", "NH농협은행<br>SC제일은행<br>SKT<br>SK브로드밴드<br>금고제작소<br>네이버스퀘어광주<br>대한치과<br>루이까스텔<br>무등빌딩<br>센스플라워<br>아성빌딩<br>아이스마트<br>우리은행<br>유광빌딩<br>토탈공인중개사사무소<br>하나은행<br>한국투자증권", "518민주화운동기록관<br>SKT<br>센스플라워<br>아이스마트<br>엘리베이터<br>유광빌딩<br>천하주차장<br>한국투자증권", "SC제일은행<br>루이까스텔", "", "SC제일은행<br>우리은행<br>유광빌딩<br>전일빌딩<br>한국투자증권", "518민주화운동기록관<br>NH투자증권<br>노스페이스<br>엘리베이터<br>유광빌딩<br>한국투자증권", "유광빌딩<br>토탈공인중개사사무소", "SKT<br>TUVA", "광주시립미술관"];
            
            try {
                Plotly.newPlot('sunburstChart', [{
                    type: "sunburst",
                    labels: sbLabels,
                    parents: sbParents,
                    values: sbValues,
                    customdata: sbCustomData,
                    branchvalues: "total",
                    textinfo: "label+value+percent parent",
                    insidetextfont: { color: '#000000', size: 13 },
                    marker: {
                        colors: sbColors,
                        line: {width: 2}
                    },
                    hovertemplate: '<b>%{label}</b><br>%{customdata}<extra></extra>'
                }], {
                    margin: { t: 20, b: 20, l: 20, r: 20 },
                    font: { family: 'Pretendard, -apple-system, sans-serif' }
                }, { displaylogo: false });
            } catch (error) {
                console.error('Error creating sunburst chart:', error);
            }
            
            var dynamicDesc = document.getElementById('dynamicDesc');
            var lastClickedLabel = null;
            
            document.getElementById('sunburstChart').on('plotly_click', function(eventData) {
    var point = eventData.points[0];
    var label = point.label;
    var value = point.value;
    
    if (label === '전체' || label === 'Total' || label === lastClickedLabel) {
        dynamicDesc.innerHTML = "<p style='color:#888; text-align:center; margin-top:20px;'>차트를 클릭하면 상세 설명이 나옵니다.</p>";
        lastClickedLabel = null;
        return;
    }
    
    lastClickedLabel = label;
    
    var childrenList = [];
    for(var i=0; i<sbParents.length; i++) {
        if(sbParents[i] === label) {
            childrenList.push({
                name: sbLabels[i],
                count: sbValues[i]
            });
        }
    }
    
    var html = "";
    
    if (label === "양호") {
        html += "<h3>양호</h3>";
        html += "<p><span class='highlight-text'>양호</span> 상태는 조사자 판단에 따라 법적 기준을 충족하거나 현장 여건상 허용 가능한 수준으로 평가된 항목입니다.</p>";
        html += "<p>전체 측정 항목 중 <strong>" + value + "개</strong>가 양호 상태로 확인되었습니다.</p>";
        if (childrenList.length > 0) {
            html += "<p>양호 상태의 세부 분류는 다음과 같습니다:</p>";
            html += "<ul style='margin-top:10px; padding-left:20px;'>";
            childrenList.forEach(function(item) {
                html += "<li><strong>" + item.name + ":</strong> " + item.count + "개</li>";
            });
            html += "</ul>";
        }
        html += "<p style='margin-top:15px; color:#C8FFC8; font-weight:600;'>이 구역들은 현재 접근성이 양호합니다.</p>";
        
    } else if (label === "개선(장기)") {
        html += "<h3>개선(장기)</h3>";
        html += "<p><span class='highlight-text'>개선(장기)</span> 상태는 법적 기준을 일부 충족하지 못하여 <strong>중장기적 개선이 필요한</strong> 항목입니다.</p>";
        html += "<p>전체 측정 항목 중 <strong>" + value + "개</strong>가 개선(장기) 상태로 분류되었습니다.</p>";
        html += "<p style='margin-top:15px;'>주요 개선이 필요한 사항:</p>";
        html += "<ul style='margin-top:10px; padding-left:20px;'>";
        html += "<li>유효폭: 1.2m 미만인 구간</li>";
        html += "<li>기울기: 4.8도를 초과하는 경사로</li>";
        html += "<li>단차: 2cm를 초과하는 지점 (실제 대부분 지점이 해당)</li>";
        html += "<li>점자블록 설치 또는 보수가 필요한 구역</li>";
        html += "<li>포장 상태가 불량한 지점</li>";
        html += "</ul>";
        html += "<p style='margin-top:15px; color:#FFFF96; font-weight:600;'>체계적인 개선 계획 수립이 권장됩니다.</p>";
        
    } else if (label === "긴급조치") {
        html += "<h3>긴급조치</h3>";
        html += "<p><span class='highlight-text'>긴급조치</span> 상태는 법적 기준을 크게 벗어나 <strong>즉각적인 개선이 필요한</strong> 항목입니다.</p>";
        html += "<p>전체 측정 항목 중 <strong>" + value + "개</strong>가 긴급조치가 필요한 상태입니다.</p>";
        html += "<p style='margin-top:15px;'>긴급 조치가 필요한 주요 사항:</p>";
        html += "<ul style='margin-top:10px; padding-left:20px;'>";
        html += "<li>유효폭: 1.2m 기준 대비 현저히 부족 (최소 1.1m 구간 존재)</li>";
        html += "<li>기울기: 심각한 급경사 구간</li>";
        html += "<li>단차: 안전사고 위험이 높은 지점</li>";
        html += "<li>포장 상태: 보행 안전을 위협하는 불량 구간</li>";
        html += "<li>점자블록: 손상 또는 완전 누락된 구역</li>";
        html += "<li>건물 진입로: 접근 자체가 어려운 출입구</li>";
        html += "</ul>";
        html += "<p style='margin-top:15px; color:#FFC8C8; font-weight:600;'>우선순위를 두고 신속한 개선 조치가 필요합니다.</p>";
        
    } else if (childrenList.length > 0) {
        html += "<h3>" + label + " 현황 분석</h3>";
        html += "<p>선택하신 <span class='highlight-text'>" + label + "</span> 상태에 대해 안내드리겠습니다.</p>";
        html += "<p>전체 항목 중 <strong>총 " + value + "개</strong>가 해당 상태로 분류되었습니다.</p>";
        html += "<p>구체적인 세부 항목을 살펴보면 다음과 같습니다.</p>";
        html += "<ul style='margin-top:10px; padding-left:20px;'>";
        childrenList.forEach(function(item) {
            html += "<li><strong>" + item.name + ":</strong> " + item.count + "곳</li>";
        });
        html += "</ul>";
        
    } else {
        html += "<h3>세부 항목: " + label + "</h3>";
        html += "<p>이 항목은 <span class='highlight-text'>" + point.parent + "</span> 상태에 속하는 <strong>" + label + "</strong> 데이터입니다.</p>";
        html += "<p>해당되는 건수는 <strong>총 " + value + "개</strong>입니다.</p>";
    }
    
    html += "<p style='margin-top:20px; font-size:0.9em; color:#999;'>* 가운데를 클릭하면 다시 전체 화면으로 돌아갑니다.</p>";
    
    dynamicDesc.innerHTML = html;
});
            
            // 박스플롯 데이터 (모든 측정값)
            const boxMX = [];
            const boxMY = [];
            const boxMPlaces = [];
            const boxCmX = [];
            const boxCmY = [];
            const boxCmPlaces = [];
            const boxDegX = [];
            const boxDegY = [];
            const boxDegPlaces = [];
            
            boxMX.push('유효폭'); boxMY.push(1.5); boxMPlaces.push('투썸플레이스');
            boxMX.push('유효폭'); boxMY.push(3.6); boxMPlaces.push('금남로공원');
            boxMX.push('유효폭'); boxMY.push(2.4); boxMPlaces.push('금남로공원');
            boxMX.push('유효폭'); boxMY.push(9.0); boxMPlaces.push('금남로공원');
            boxMX.push('유효폭'); boxMY.push(3.7); boxMPlaces.push('금남로공원');
            boxMX.push('유효폭'); boxMY.push(2.3); boxMPlaces.push('금남로공원');
            boxMX.push('유효폭'); boxMY.push(2.3); boxMPlaces.push('금남로공원');
            boxMX.push('유효폭'); boxMY.push(1.9); boxMPlaces.push('투썸플레이스');
            boxMX.push('유효폭'); boxMY.push(3.4); boxMPlaces.push('투썸플레이스');
            boxMX.push('유효폭'); boxMY.push(2.9); boxMPlaces.push('투썸플레이스');
            boxMX.push('유효폭'); boxMY.push(1.4); boxMPlaces.push('투썸플레이스');
            boxMX.push('유효폭'); boxMY.push(1.5); boxMPlaces.push('금남로공원');
            boxMX.push('유효폭'); boxMY.push(1.2); boxMPlaces.push('금남로공원');
            boxMX.push('유효폭'); boxMY.push(1.5); boxMPlaces.push('SC제일은행');
            boxMX.push('유효폭'); boxMY.push(1.0); boxMPlaces.push('SC제일은행');
            boxMX.push('유효폭'); boxMY.push(1.1); boxMPlaces.push('SC제일은행');
            boxMX.push('유효폭'); boxMY.push(4.3); boxMPlaces.push('SC제일은행');
            boxMX.push('유효폭'); boxMY.push(1.5); boxMPlaces.push('SC제일은행');
            boxMX.push('유효폭'); boxMY.push(1.9); boxMPlaces.push('우리은행');
            boxMX.push('유효폭'); boxMY.push(0.9); boxMPlaces.push('우리은행');
            boxMX.push('유효폭'); boxMY.push(2.2); boxMPlaces.push('우리은행');
            boxMX.push('유효폭'); boxMY.push(1.0); boxMPlaces.push('우리은행');
            boxMX.push('유효폭'); boxMY.push(4.5); boxMPlaces.push('우리은행');
            boxMX.push('유효폭'); boxMY.push(1.5); boxMPlaces.push('우리은행');
            boxMX.push('유효폭'); boxMY.push(1.5); boxMPlaces.push('흥국화재빌딩');
            boxMX.push('유효폭'); boxMY.push(2.0); boxMPlaces.push('흥국화재빌딩');
            boxMX.push('유효폭'); boxMY.push(3.6); boxMPlaces.push('흥국화재빌딩');
            boxMX.push('유효폭'); boxMY.push(1.0); boxMPlaces.push('금고제작소');
            boxMX.push('유효폭'); boxMY.push(1.8); boxMPlaces.push('SKT');
            boxMX.push('유효폭'); boxMY.push(0.9); boxMPlaces.push('YMCA');
            boxMX.push('유효폭'); boxMY.push(0.9); boxMPlaces.push('YMCA');
            boxMX.push('유효폭'); boxMY.push(3.9); boxMPlaces.push('YMCA');
            boxMX.push('유효폭'); boxMY.push(3.8); boxMPlaces.push('YMCA');
            boxMX.push('유효폭'); boxMY.push(4.1); boxMPlaces.push('YMCA');
            boxMX.push('유효폭'); boxMY.push(1.2); boxMPlaces.push('풀덤');
            boxMX.push('유효폭'); boxMY.push(1.4); boxMPlaces.push('노스페이스');
            boxMX.push('유효폭'); boxMY.push(6.9); boxMPlaces.push('노스페이스');
            boxMX.push('유효폭'); boxMY.push(5.3); boxMPlaces.push('노스페이스');
            boxMX.push('유효폭'); boxMY.push(1.1); boxMPlaces.push('노스페이스');
            boxMX.push('유효폭'); boxMY.push(1.3); boxMPlaces.push('천하주차장');
            boxMX.push('유효폭'); boxMY.push(3.4); boxMPlaces.push('YMCA');
            boxMX.push('유효폭'); boxMY.push(3.4); boxMPlaces.push('YMCA');
            boxMX.push('유효폭'); boxMY.push(0.9); boxMPlaces.push('YMCA');
            boxMX.push('유효폭'); boxMY.push(0.9); boxMPlaces.push('유광빌딩');
            boxMX.push('유효폭'); boxMY.push(1.4); boxMPlaces.push('유광빌딩');
            boxMX.push('유효폭'); boxMY.push(1.3); boxMPlaces.push('유광빌딩');
            boxMX.push('유효폭'); boxMY.push(1.2); boxMPlaces.push('유광빌딩');
            boxMX.push('유효폭'); boxMY.push(1.6); boxMPlaces.push('아성빌딩');
            boxMX.push('유효폭'); boxMY.push(1.4); boxMPlaces.push('아성빌딩');
            boxMX.push('유효폭'); boxMY.push(1.5); boxMPlaces.push('아성빌딩');
            boxMX.push('유효폭'); boxMY.push(1.5); boxMPlaces.push('무등빌딩');
            boxMX.push('유효폭'); boxMY.push(4.5); boxMPlaces.push('무등빌딩');
            boxMX.push('유효폭'); boxMY.push(0.95); boxMPlaces.push('무등빌딩');
            boxMX.push('유효폭'); boxMY.push(3.7); boxMPlaces.push('TUVA');
            boxMX.push('유효폭'); boxMY.push(1.3); boxMPlaces.push('TUVA');
            boxMX.push('유효폭'); boxMY.push(4.3); boxMPlaces.push('TUVA');
            boxMX.push('유효폭'); boxMY.push(1.5); boxMPlaces.push('TUVA');
            boxMX.push('유효폭'); boxMY.push(1.5); boxMPlaces.push('SKT');
            boxMX.push('유효폭'); boxMY.push(2.2); boxMPlaces.push('SK브로드밴드');
            boxMX.push('유효폭'); boxMY.push(0.8); boxMPlaces.push('SK브로드밴드');
            boxMX.push('유효폭'); boxMY.push(4.5); boxMPlaces.push('SK브로드밴드');
            boxMX.push('유효폭'); boxMY.push(4.1); boxMPlaces.push('NH농협은행');
            boxMX.push('유효폭'); boxMY.push(1.8); boxMPlaces.push('NH농협은행');
            boxMX.push('유효폭'); boxMY.push(2.1); boxMPlaces.push('NH농협은행');
            boxMX.push('유효폭'); boxMY.push(1.5); boxMPlaces.push('네이버스퀘어광주');
            boxMX.push('유효폭'); boxMY.push(3.6); boxMPlaces.push('네이버스퀘어광주');
            boxMX.push('유효폭'); boxMY.push(1.4); boxMPlaces.push('518민주화운동기록관');
            boxMX.push('유효폭'); boxMY.push(3.2); boxMPlaces.push('518민주화운동기록관');
            boxMX.push('유효폭'); boxMY.push(1.1); boxMPlaces.push('518민주화운동기록관');
            boxMX.push('유효폭'); boxMY.push(1.1); boxMPlaces.push('NH투자증권');
            boxMX.push('유효폭'); boxMY.push(1.8); boxMPlaces.push('NH투자증권');
            boxMX.push('유효폭'); boxMY.push(1.8); boxMPlaces.push('NH투자증권');
            boxMX.push('유효폭'); boxMY.push(3.7); boxMPlaces.push('루이까스텔');
            boxMX.push('유효폭'); boxMY.push(1.8); boxMPlaces.push('루이까스텔');
            boxMX.push('유효폭'); boxMY.push(1.9); boxMPlaces.push('대한치과');
            boxMX.push('유효폭'); boxMY.push(0.7); boxMPlaces.push('토탈공인중개사사무소');
            boxMX.push('유효폭'); boxMY.push(1.6); boxMPlaces.push('토탈공인중개사사무소');
            boxMX.push('유효폭'); boxMY.push(1.8); boxMPlaces.push('토탈공인중개사사무소');
            boxMX.push('유효폭'); boxMY.push(0.9); boxMPlaces.push('커피리나');
            boxMX.push('유효폭'); boxMY.push(3.0); boxMPlaces.push('광주시립미술관');
            boxMX.push('유효폭'); boxMY.push(0.9); boxMPlaces.push('센스플라워');
            boxMX.push('유효폭'); boxMY.push(1.7); boxMPlaces.push('센스플라워');
            boxMX.push('유효폭'); boxMY.push(2.2); boxMPlaces.push('센스플라워');
            boxMX.push('유효폭'); boxMY.push(1.8); boxMPlaces.push('아이스마트');
            boxMX.push('유효폭'); boxMY.push(1.6); boxMPlaces.push('GS25금남센터시티점');
            boxMX.push('유효폭'); boxMY.push(1.7); boxMPlaces.push('GS25금남센터시티점');
            boxMX.push('유효폭'); boxMY.push(5.7); boxMPlaces.push('GS25금남센터시티점');
            boxMX.push('유효폭'); boxMY.push(0.8); boxMPlaces.push('한국투자증권');
            boxMX.push('유효폭'); boxMY.push(4.0); boxMPlaces.push('한국투자증권');
            boxMX.push('유효폭'); boxMY.push(1.7); boxMPlaces.push('한국투자증권');
            boxMX.push('유효폭'); boxMY.push(1.1); boxMPlaces.push('한국투자증권');
            boxMX.push('유효폭'); boxMY.push(1.6); boxMPlaces.push('하나은행');
            boxMX.push('유효폭'); boxMY.push(1.2); boxMPlaces.push('하나은행');
            boxMX.push('유효폭'); boxMY.push(2.4); boxMPlaces.push('하나은행');
            boxMX.push('유효폭'); boxMY.push(1.0); boxMPlaces.push('하나은행');
            boxMX.push('유효폭'); boxMY.push(1.9); boxMPlaces.push('전일빌딩');
            boxMX.push('유효폭'); boxMY.push(1.5); boxMPlaces.push('엘리베이터');
            boxMX.push('유효폭'); boxMY.push(5.1); boxMPlaces.push('전일빌딩');
            boxMX.push('유효폭'); boxMY.push(5.3); boxMPlaces.push('센스플라워');
            boxMX.push('유효폭'); boxMY.push(4.1); boxMPlaces.push('토탈공인중개사사무소');
            boxMX.push('유효폭'); boxMY.push(2.1); boxMPlaces.push('SKT');
            boxMX.push('유효폭'); boxMY.push(0.7); boxMPlaces.push('센스플라워');
            boxMX.push('유효폭'); boxMY.push(1.8); boxMPlaces.push('아이스마트');

            boxCmX.push('단차'); boxCmY.push(3.5); boxCmPlaces.push('YMCA');
            boxCmX.push('단차'); boxCmY.push(5.8); boxCmPlaces.push('YMCA');
            boxCmX.push('단차'); boxCmY.push(18.0); boxCmPlaces.push('NH농협은행');
            boxCmX.push('단차'); boxCmY.push(21.0); boxCmPlaces.push('루이까스텔');
            boxCmX.push('단차'); boxCmY.push(18.0); boxCmPlaces.push('대한치과');
            boxCmX.push('단차'); boxCmY.push(4.0); boxCmPlaces.push('토탈공인중개사사무소');
            boxCmX.push('단차'); boxCmY.push(1.0); boxCmPlaces.push('토탈공인중개사사무소');
            boxCmX.push('단차'); boxCmY.push(1.5); boxCmPlaces.push('센스플라워');
            boxCmX.push('단차'); boxCmY.push(11.5); boxCmPlaces.push('아이스마트');
            boxCmX.push('단차'); boxCmY.push(2.5); boxCmPlaces.push('아이스마트');
            boxCmX.push('단차'); boxCmY.push(3.3); boxCmPlaces.push('GS25금남센터시티점');
            boxCmX.push('단차'); boxCmY.push(18.0); boxCmPlaces.push('한국투자증권');
            boxCmX.push('단차'); boxCmY.push(18.0); boxCmPlaces.push('한국투자증권');
            boxCmX.push('단차'); boxCmY.push(3.5); boxCmPlaces.push('센스플라워');
            boxCmX.push('단차'); boxCmY.push(2.1); boxCmPlaces.push('토탈공인중개사사무소');
            boxCmX.push('단차'); boxCmY.push(14.0); boxCmPlaces.push('센스플라워');

            boxDegX.push('기울기'); boxDegY.push(2.4); boxDegPlaces.push('금남로공원');
            boxDegX.push('기울기'); boxDegY.push(3.6); boxDegPlaces.push('투썸플레이스');
            boxDegX.push('기울기'); boxDegY.push(4.8); boxDegPlaces.push('투썸플레이스');
            boxDegX.push('기울기'); boxDegY.push(9.7); boxDegPlaces.push('SC제일은행');
            boxDegX.push('기울기'); boxDegY.push(7.9); boxDegPlaces.push('SC제일은행');
            boxDegX.push('기울기'); boxDegY.push(9.2); boxDegPlaces.push('우리은행');
            boxDegX.push('기울기'); boxDegY.push(1.4); boxDegPlaces.push('우리은행');
            boxDegX.push('기울기'); boxDegY.push(8.8); boxDegPlaces.push('우리은행');
            boxDegX.push('기울기'); boxDegY.push(7.3); boxDegPlaces.push('우리은행');
            boxDegX.push('기울기'); boxDegY.push(6.7); boxDegPlaces.push('흥국화재빌딩');
            boxDegX.push('기울기'); boxDegY.push(4.5); boxDegPlaces.push('흥국화재빌딩');
            boxDegX.push('기울기'); boxDegY.push(3.6); boxDegPlaces.push('금고제작소');
            boxDegX.push('기울기'); boxDegY.push(4.3); boxDegPlaces.push('금고제작소');
            boxDegX.push('기울기'); boxDegY.push(3.7); boxDegPlaces.push('SKT');
            boxDegX.push('기울기'); boxDegY.push(8.0); boxDegPlaces.push('SKT');
            boxDegX.push('기울기'); boxDegY.push(8.3); boxDegPlaces.push('YMCA');
            boxDegX.push('기울기'); boxDegY.push(8.3); boxDegPlaces.push('YMCA');
            boxDegX.push('기울기'); boxDegY.push(3.5); boxDegPlaces.push('YMCA');
            boxDegX.push('기울기'); boxDegY.push(3.5); boxDegPlaces.push('풀덤');
            boxDegX.push('기울기'); boxDegY.push(1.4); boxDegPlaces.push('노스페이스');
            boxDegX.push('기울기'); boxDegY.push(5.9); boxDegPlaces.push('천하주차장');
            boxDegX.push('기울기'); boxDegY.push(3.6); boxDegPlaces.push('YMCA');
            boxDegX.push('기울기'); boxDegY.push(3.6); boxDegPlaces.push('YMCA');
            boxDegX.push('기울기'); boxDegY.push(2.7); boxDegPlaces.push('YMCA');
            boxDegX.push('기울기'); boxDegY.push(5.4); boxDegPlaces.push('유광빌딩');
            boxDegX.push('기울기'); boxDegY.push(16.8); boxDegPlaces.push('유광빌딩');
            boxDegX.push('기울기'); boxDegY.push(7.8); boxDegPlaces.push('유광빌딩');
            boxDegX.push('기울기'); boxDegY.push(6.7); boxDegPlaces.push('아성빌딩');
            boxDegX.push('기울기'); boxDegY.push(4.5); boxDegPlaces.push('아성빌딩');
            boxDegX.push('기울기'); boxDegY.push(7.0); boxDegPlaces.push('무등빌딩');
            boxDegX.push('기울기'); boxDegY.push(9.1); boxDegPlaces.push('TUVA');
            boxDegX.push('기울기'); boxDegY.push(6.6); boxDegPlaces.push('SK브로드밴드');
            boxDegX.push('기울기'); boxDegY.push(16.0); boxDegPlaces.push('NH농협은행');
            boxDegX.push('기울기'); boxDegY.push(7.7); boxDegPlaces.push('네이버스퀘어광주');
            boxDegX.push('기울기'); boxDegY.push(4.0); boxDegPlaces.push('518민주화운동기록관');
            boxDegX.push('기울기'); boxDegY.push(7.6); boxDegPlaces.push('518민주화운동기록관');
            boxDegX.push('기울기'); boxDegY.push(1.0); boxDegPlaces.push('NH투자증권');
            boxDegX.push('기울기'); boxDegY.push(2.2); boxDegPlaces.push('커피리나');
            boxDegX.push('기울기'); boxDegY.push(8.0); boxDegPlaces.push('한국투자증권');
            boxDegX.push('기울기'); boxDegY.push(8.6); boxDegPlaces.push('하나은행');
            boxDegX.push('기울기'); boxDegY.push(26.0); boxDegPlaces.push('하나은행');
            boxDegX.push('기울기'); boxDegY.push(10.1); boxDegPlaces.push('엘리베이터');

            
            Plotly.newPlot('boxChartM', [{
                x: boxMX,
                y: boxMY,
                type: 'box',
                name: '데이터',
                boxpoints: 'all',
                jitter: 0.3,
                pointpos: -1.8,
                marker: { 
                    color: '#42A5F5',
                    size: 6
                },
                text: boxMPlaces,
                hoveron: 'boxes+points',
                hovertemplate: '<b>%{text}</b><br>유효폭: %{y}m<extra></extra>'
            }], {
                title: '<b>유효폭 분포 (m)</b>',
                yaxis: { title: '미터 (m)' },
                margin: { t: 40, b: 60, l: 50, r: 20 },
                font: { family: 'Pretendard, -apple-system, sans-serif' },
                shapes: [{
                    type: 'line',
                    x0: -0.5,
                    x1: 0.5,
                    y0: 1.2,
                    y1: 1.2,
                    line: { color: 'red', width: 2, dash: 'dash' }
                }],
                annotations: [{
                    x: 0,
                    y: 1.2,
                    text: '법적기준: 1.2m',
                    showarrow: false,
                    yshift: 10,
                    font: { color: 'red', size: 10 }
                }]
            }, { displaylogo: false });
            
            if (boxCmY.length > 0) {
                Plotly.newPlot('boxChartCm', [{
                    x: boxCmX,
                    y: boxCmY,
                    type: 'box',
                    name: '데이터',
                    boxpoints: 'all',
                    jitter: 0.3,
                    pointpos: -1.8,
                    marker: { 
                        color: '#AB47BC',
                        size: 6
                    },
                    text: boxCmPlaces,
                    hoveron: 'boxes+points',
                    hovertemplate: '<b>%{text}</b><br>단차: %{y}cm<extra></extra>'
                }], {
                    title: '<b>단차 분포 (cm)</b>',
                    yaxis: { title: '센티미터 (cm)' },
                    margin: { t: 40, b: 60, l: 50, r: 20 },
                    font: { family: 'Pretendard, -apple-system, sans-serif' },
                    shapes: [{
                        type: 'line',
                        x0: -0.5,
                        x1: 0.5,
                        y0: 2.0,
                        y1: 2.0,
                        line: { color: 'red', width: 2, dash: 'dash' }
                    }],
                    annotations: [{
                        x: 0,
                        y: 2.0,
                        text: '법적기준: 2cm',
                        showarrow: false,
                        yshift: 10,
                        font: { color: 'red', size: 10 }
                    }]
                }, { displaylogo: false });
            } else {
                document.getElementById('boxChartCm').innerHTML = '<div style="padding:50px; text-align:center; color:#999;">단차 데이터가 없습니다.</div>';
            }
            
            if (boxDegY.length > 0) {
                Plotly.newPlot('boxChartDeg', [{
                    x: boxDegX,
                    y: boxDegY,
                    type: 'box',
                    name: '데이터',
                    boxpoints: 'all',
                    jitter: 0.3,
                    pointpos: -1.8,
                    marker: { 
                        color: '#FF7043',
                        size: 6
                    },
                    text: boxDegPlaces,
                    hoveron: 'boxes+points',
                    hovertemplate: '<b>%{text}</b><br>기울기: %{y}도<extra></extra>'
                }], {
                    title: '<b>기울기 분포 (도)</b>',
                    yaxis: { title: '각도 (Degree)' },
                    margin: { t: 40, b: 60, l: 50, r: 20 },
                    font: { family: 'Pretendard, -apple-system, sans-serif' },
                    shapes: [{
                        type: 'line',
                        x0: -0.5,
                        x1: 0.5,
                        y0: 4.8,
                        y1: 4.8,
                        line: { color: 'red', width: 2, dash: 'dash' }
                    }],
                    annotations: [{
                        x: 0,
                        y: 4.8,
                        text: '법적기준: 4.8도',
                        showarrow: false,
                        yshift: 10,
                        font: { color: 'red', size: 10 }
                    }]
                }, { displaylogo: false });
            } else {
                document.getElementById('boxChartDeg').innerHTML = '<div style="padding:50px; text-align:center; color:#999;">기울기 데이터가 없습니다.</div>';
            }
        }

