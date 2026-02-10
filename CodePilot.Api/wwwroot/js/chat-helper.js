// Chat Helper - Enhanced input features for Blazor Chat page
(function () {
    'use strict';

    let dotnetRef = null;
    let currentEventSource = null;
    let fileCache = [];
    let skillsCache = [];

    // Initialize
    window.chatHelper = {
        init: function (dotnetReference) {
            dotnetRef = dotnetReference;
            console.log('Chat helper initialized');
        },

        // Start SSE streaming
        startStreaming: async function (sessionId, content, mode, model) {
            if (currentEventSource) {
                currentEventSource.close();
            }

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        session_id: sessionId,
                        content: content,
                        mode: mode,
                        model: model
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    await dotnetRef.invokeMethodAsync('OnStreamError', errorData.error || 'Request failed');
                    return;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;

                        try {
                            const eventData = JSON.parse(line.slice(6));
                            await dotnetRef.invokeMethodAsync('OnStreamEvent', eventData);

                            if (eventData.type === 'done') {
                                await dotnetRef.invokeMethodAsync('OnStreamComplete');
                                return;
                            }
                        } catch (err) {
                            console.error('Error parsing SSE event:', err);
                        }
                    }
                }

                await dotnetRef.invokeMethodAsync('OnStreamComplete');
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log('Stream aborted');
                } else {
                    console.error('Streaming error:', error);
                    await dotnetRef.invokeMethodAsync('OnStreamError', error.message);
                }
            }
        },

        // Stop streaming
        stopStreaming: function () {
            if (currentEventSource) {
                currentEventSource.close();
                currentEventSource = null;
            }
        },

        // Auto-scroll to bottom
        scrollToBottom: function (containerId) {
            const container = document.getElementById(containerId);
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        },

        // Fetch files for @ autocomplete
        fetchFiles: async function (sessionId, filter) {
            try {
                const params = new URLSearchParams();
                if (sessionId) params.set('session_id', sessionId);
                if (filter) params.set('q', filter);

                const response = await fetch(`/api/files?${params.toString()}`);
                if (!response.ok) return [];

                const data = await response.json();
                const tree = data.tree || [];
                const items = [];

                function flattenTree(nodes) {
                    for (const node of nodes) {
                        items.push({ label: node.name, value: node.path });
                        if (node.children) flattenTree(node.children);
                    }
                }

                flattenTree(tree);
                fileCache = items.slice(0, 20);
                return fileCache;
            } catch (error) {
                console.error('Error fetching files:', error);
                return [];
            }
        },

        // Fetch skills/commands for / autocomplete
        fetchSkills: async function (filter) {
            const builtInCommands = [
                { label: 'help', value: '/help', description: 'Show help information', builtIn: true },
                { label: 'clear', value: '/clear', description: 'Clear conversation', builtIn: true },
                { label: 'compact', value: '/compact', description: 'Compress context', builtIn: true },
                { label: 'cost', value: '/cost', description: 'Show token usage', builtIn: true },
                { label: 'doctor', value: '/doctor', description: 'Check system health', builtIn: true },
                { label: 'init', value: '/init', description: 'Initialize CLAUDE.md', builtIn: true },
                { label: 'review', value: '/review', description: 'Code review', builtIn: true },
                { label: 'terminal-setup', value: '/terminal-setup', description: 'Terminal config', builtIn: true }
            ];

            let filteredBuiltIn = builtInCommands;
            if (filter) {
                filteredBuiltIn = builtInCommands.filter(cmd => 
                    cmd.label.toLowerCase().includes(filter.toLowerCase())
                );
            }

            try {
                const response = await fetch('/api/skills');
                if (response.ok) {
                    const data = await response.json();
                    const apiSkills = (data.skills || [])
                        .filter(s => s.enabled && (!filter || s.name.toLowerCase().includes(filter.toLowerCase())))
                        .map(s => ({
                            label: s.name,
                            value: `/${s.name}`,
                            description: s.description,
                            builtIn: false
                        }));

                    skillsCache = [...filteredBuiltIn, ...apiSkills].slice(0, 20);
                } else {
                    skillsCache = filteredBuiltIn.slice(0, 20);
                }
            } catch (error) {
                console.error('Error fetching skills:', error);
                skillsCache = filteredBuiltIn.slice(0, 20);
            }

            return skillsCache;
        },

        // Cleanup
        dispose: function () {
            if (currentEventSource) {
                currentEventSource.close();
                currentEventSource = null;
            }
            dotnetRef = null;
            fileCache = [];
            skillsCache = [];
        }
    };
})();
