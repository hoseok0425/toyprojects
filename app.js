const functions = require('firebase-functions');

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));

exports.app = functions.https.onRequest(app);



// 프로젝트 서버 실행 함수
async function startProjectServer(projectId) {
    const projectPath = path.join(__dirname, 'projects', projectId, 'backend');
    const serverProcess = spawn('node', ['server.js'], { cwd: projectPath });

    serverProcess.stdout.on('data', (data) => {
        console.log(`${projectId} stdout: ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`${projectId} stderr: ${data}`);
    });

    // 서버가 실행될 때까지 대기
    await new Promise((resolve) => setTimeout(resolve, 5000));
}

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

// 프로젝트별 프록시 설정
app.use('/project/:id', async (req, res, next) => {
    const projectId = req.params.id;
    const projectPath = path.join(__dirname, 'projects', projectId);

    try {
        await fs.access(path.join(projectPath, 'backend', 'server.js'));
        // 백엔드가 있는 경우 프록시 설정
        await startProjectServer(projectId);
        createProxyMiddleware({
            target: 'http://localhost:3001', // 프로젝트 서버 포트
            changeOrigin: true
        })(req, res, next);
    } catch (error) {
        // 백엔드가 없는 경우 정적 파일 제공
        express.static(path.join(projectPath, 'frontend'))(req, res, next);
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});