const functions = require('firebase-functions');
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));

// 프로젝트 서버 실행 함수 (Firebase Functions에서는 사용하지 않음)
// async function startProjectServer(projectId) { ... }

app.get('/', async (req, res) => {
    try {
        const projectsDir = path.join(__dirname, 'projects');
        const projects = await fs.readdir(projectsDir);
        const projectData = await Promise.all(projects.map(async (project) => {
            const infoPath = path.join(projectsDir, project, 'info.json');
            const info = JSON.parse(await fs.readFile(infoPath, 'utf-8'));
            return { ...info, id: project };
        }));
        res.render('index', { projects: projectData });
    } catch (err) {
        console.error(err);
        res.status(500).send('서버 오류가 발생했습니다.');
    }
});

// 프로젝트별 프록시 설정 (Firebase Functions에서는 수정 필요)
app.use('/project/:id', async (req, res, next) => {
    const projectId = req.params.id;
    const projectPath = path.join(__dirname, 'projects', projectId);

    try {
        await fs.access(path.join(projectPath, 'backend', 'server.js'));
        // Firebase Functions에서는 프록시 설정을 다르게 해야 합니다.
        // 여기서는 임시로 오류 메시지를 반환합니다.
        res.status(500).send('Firebase Functions에서는 이 기능을 지원하지 않습니다.');
    } catch (error) {
        // 백엔드가 없는 경우 정적 파일 제공
        express.static(path.join(projectPath, 'frontend'))(req, res, next);
    }
});

// Firebase Functions에서는 app.listen()을 사용하지 않습니다.
// const port = process.env.PORT || 3000;
// app.listen(port, () => { ... });

// 대신 다음과 같이 export 합니다:
exports.app = functions.https.onRequest(app);