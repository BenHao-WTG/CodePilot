// Chat SSE streaming handler
window.chatHelper = {
    abortController: null,
    dotnetRef: null,

    // Initialize chat with DotNet reference
    init: function(dotnetReference) {
        this.dotnetRef = dotnetReference;
    },

    // Start streaming from API
    startStreaming: function(sessionId, content, mode, model) {
        if (this.abortController) {
            this.stopStreaming();
        }

        this.abortController = new AbortController();
        const url = `/api/chat`;
        const body = JSON.stringify({
            session_id: sessionId,
            content: content,
            mode: mode || 'code',
            model: model || 'gpt-4'
        });

        // Use fetch with streaming response
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: body,
            signal: this.abortController.signal
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.body;
        })
        .then(body => {
            const reader = body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            const readChunk = () => {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        if (this.dotnetRef) {
                            this.dotnetRef.invokeMethodAsync('OnStreamComplete');
                        }
                        return;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const eventData = JSON.parse(line.slice(6));
                                if (this.dotnetRef) {
                                    this.dotnetRef.invokeMethodAsync('OnStreamEvent', eventData);
                                }
                            } catch (e) {
                                console.error('Failed to parse SSE event:', e);
                            }
                        }
                    }

                    readChunk();
                }).catch(error => {
                    if (error.name !== 'AbortError' && this.dotnetRef) {
                        this.dotnetRef.invokeMethodAsync('OnStreamError', error.message);
                    }
                });
            };

            readChunk();
        })
        .catch(error => {
            if (error.name !== 'AbortError' && this.dotnetRef) {
                this.dotnetRef.invokeMethodAsync('OnStreamError', error.message);
            }
        });
    },

    // Stop streaming
    stopStreaming: function() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    },

    // Scroll to bottom of message container
    scrollToBottom: function(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    },

    // Cleanup
    dispose: function() {
        this.stopStreaming();
        this.dotnetRef = null;
    }
};
