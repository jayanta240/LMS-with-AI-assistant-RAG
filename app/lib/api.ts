const BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:8000");

// ============================================================
// AUTH HEADER
// ============================================================

function getAuthHeaders() {

  const token = localStorage.getItem("token");

  return {
    Authorization: `Bearer ${token}`,
  };

}


function getChatCacheIdentity() {
  if (typeof window === "undefined") {
    return "server";
  }

  const userId =
    localStorage.getItem("user_id") || "unknown-user";

  const companyId =
    localStorage.getItem("company_id") || "no-company";

  return `${userId}:${companyId}`;
}

const chatSessionsCache =
  new Map<string, any[]>();

const chatMessagesCache =
  new Map<string, any[]>();

function chatSessionsCacheKey() {
  return getChatCacheIdentity();
}

function chatMessagesCacheKey(session_id: string) {
  return `${getChatCacheIdentity()}:${session_id}`;
}

function updateChatMessagesCache(
  session_id: string,
  messages: any[]
) {
  chatMessagesCache.set(
    chatMessagesCacheKey(session_id),
    messages.slice(-100)
  );
}


// ============================================================
// SEND CHAT MESSAGE
// ============================================================

export async function sendMessage(
  message: string,
  session_id: string
) {

  const res = await fetch(
    `${BASE}/api/chat`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },

      body: JSON.stringify({
        message,
        session_id,
      }),
    }
  );

  const contentType =
    res.headers.get("content-type") || "";

  let data: any = null;

  if (contentType.includes("application/json")) {

    try {

      data = await res.json();

    } catch {

      data = null;

    }

  } else {

    const text = await res.text();

    data = {
      detail: text,
    };

  }

  if (!res.ok) {

    throw new Error(
      data?.detail ||
      data?.message ||
      "Chat request failed"
    );

  }

  const cacheKey =
    chatMessagesCacheKey(session_id);

  const cached =
    chatMessagesCache.get(cacheKey);

  if (cached) {
    updateChatMessagesCache(
      session_id,
      [
        ...cached,
        {
          role: "user",
          content: message,
        },
        {
          role: "assistant",
          content:
            data?.answer ||
            "I could not generate a response.",
          sources:
            Array.isArray(data?.sources)
              ? data.sources
              : [],
        },
      ]
    );
  }

  return data;

}


// ============================================================
// UPLOAD ASSISTANT CONTENT
// ============================================================

export async function uploadVideos(
  files: FileList,
  visibility: string = "company",
  departmentId?: number,
  courseId?: number,
  onProgress?: (
    fileName: string,
    percentage: number
  ) => void
) {
  const fileArray = Array.from(files);

  const uploaded: string[] = [];
  const failed: {
    file: string;
    error: string;
  }[] = [];


  // ==========================================================
  // UPLOAD EACH FILE SEPARATELY
  // ==========================================================

  for (const file of fileArray) {

    try {

      const formData =
        new FormData();


      formData.append(
        "files",
        file
      );


      // -----------------------------
      // ACCESS SETTINGS
      // -----------------------------

      formData.append(
        "visibility",
        visibility
      );


      if (
        departmentId !== undefined
      ) {

        formData.append(
          "department_id",
          String(departmentId)
        );

      }


      if (
        courseId !== undefined
      ) {

        formData.append(
          "course_id",
          String(courseId)
        );

      }


      // ========================================================
      // XMLHttpRequest
      // Used instead of fetch because XHR
      // exposes upload progress events.
      // ========================================================

      await new Promise<void>(
        (
          resolve,
          reject
        ) => {

          const xhr =
            new XMLHttpRequest();


          xhr.open(
            "POST",
            `${BASE}/api/upload`
          );


          // -----------------------------
          // AUTH
          // -----------------------------

          const token =
            localStorage.getItem(
              "token"
            );


          if (token) {

            xhr.setRequestHeader(
              "Authorization",
              `Bearer ${token}`
            );

          }


          // ====================================================
          // REAL UPLOAD PROGRESS
          // ====================================================

          xhr.upload.onprogress =
            (event) => {

              if (
                event.lengthComputable
              ) {

                const percentage =
                  Math.round(
                    (
                      event.loaded /
                      event.total
                    ) * 100
                  );


                onProgress?.(
                  file.name,
                  percentage
                );

              }

            };


          // ====================================================
          // REQUEST COMPLETE
          // ====================================================

          xhr.onload = () => {

            let data: any =
              null;


            try {

              data =
                xhr.responseText
                  ? JSON.parse(
                      xhr.responseText
                    )
                  : null;

            } catch {
              data = null;
            }


            // -----------------------------
            // SUCCESS
            // -----------------------------

            if (
              xhr.status >= 200 &&
              xhr.status < 300
            ) {

              /*
               * Make sure the frontend
               * receives 100% at the end.
               */

              onProgress?.(
                file.name,
                100
              );


              /*
               * Your backend returns:
               *
               * {
               *   uploaded: [...],
               *   failed: [...]
               * }
               */

              if (
                Array.isArray(
                  data?.uploaded
                ) &&
                data.uploaded.includes(
                  file.name
                )
              ) {

                uploaded.push(
                  file.name
                );

              } else if (
                data?.success
              ) {

                uploaded.push(
                  file.name
                );

              } else {

                failed.push({
                  file:
                    file.name,

                  error:
                    data?.message ||
                    data?.detail ||
                    "Upload failed",
                });

              }


              resolve();

              return;
            }


            // -----------------------------
            // HTTP ERROR
            // -----------------------------

            const errorMessage =
              data?.detail ||
              data?.message ||
              `Upload failed (${xhr.status})`;


            failed.push({
              file:
                file.name,

              error:
                errorMessage,
            });


            reject(
              new Error(
                errorMessage
              )
            );

          };


          // ====================================================
          // NETWORK ERROR
          // ====================================================

          xhr.onerror = () => {

            const message =
              "Network error while uploading file.";


            failed.push({
              file:
                file.name,

              error:
                message,
            });


            reject(
              new Error(
                message
              )
            );

          };


          // ====================================================
          // ABORT
          // ====================================================

          xhr.onabort = () => {

            const message =
              "Upload was cancelled.";


            failed.push({
              file:
                file.name,

              error:
                message,
            });


            reject(
              new Error(
                message
              )
            );

          };


          // ====================================================
          // SEND
          // ====================================================

          xhr.send(
            formData
          );

        }
      );

    } catch (error: any) {

      /*
       * Do not stop all uploads because
       * one file failed.
       */

      if (
        !failed.some(
          (item) =>
            item.file ===
            file.name
        )
      ) {

        failed.push({
          file:
            file.name,

          error:
            error?.message ||
            "Upload failed",
        });

      }

    }

  }


  // ==========================================================
  // RETURN SAME BASIC RESPONSE SHAPE
  // ==========================================================

  return {
    success:
      failed.length === 0,

    uploaded,

    failed,
  };
}


// ============================================================
// GENERATE VIDEO
// ============================================================
// ============================================================
// GET MY CERTIFICATES
// ============================================================

export async function getMyCertificates() {

  const res = await fetch(
    `${BASE}/api/my-certificates`,
    {
      headers: getAuthHeaders(),
      cache: "no-store",
    }
  );


  const data = await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to load certificates"
    );

  }


  return data;
}


// ============================================================
// GET SINGLE CERTIFICATE
// ============================================================

export async function getCertificate(
  certificateId: number
) {

  const res = await fetch(
    `${BASE}/api/certificates/${certificateId}`,
    {
      headers: getAuthHeaders(),
      cache: "no-store",
    }
  );


  const data = await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to load certificate"
    );

  }


  return data;
}
export async function generateVideo(
  message: string
) {

  const res = await fetch(
    `${BASE}/api/generate-video`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },

      body: JSON.stringify({
        message,
        session_id: "chat-1",
      }),
    }
  );


  const data = await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      data?.message ||
      "Video generation failed"
    );

  }


  return data;

}


// ============================================================
// GET SESSION MESSAGES
// ============================================================

export async function getMessages(
  session_id: string
) {
  const cacheKey =
    chatMessagesCacheKey(session_id);

  const cached =
    chatMessagesCache.get(cacheKey);

  const refresh = fetch(
    `${BASE}/api/sessions/${session_id}/messages`,
    {
      headers: getAuthHeaders(),
      cache: "no-store",
    }
  )
    .then(async (res) => {
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.detail ||
          data?.message ||
          "Failed to load messages"
        );
      }

      const normalized =
        Array.isArray(data) ? data : [];

      updateChatMessagesCache(
        session_id,
        normalized
      );

      return normalized;
    });

  if (cached) {
    refresh.catch((error) => {
      console.error(
        "Background chat refresh failed:",
        error
      );
    });

    return cached;
  }

  return refresh;
}


// ============================================================
// CREATE SESSION
// ============================================================

export async function createSession() {

  const res = await fetch(
    `${BASE}/api/sessions`,
    {
      method: "POST",

      headers: getAuthHeaders(),
    }
  );


  const data = await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to create session"
    );

  }


  const cached =
    chatSessionsCache.get(
      chatSessionsCacheKey()
    ) || [];

  chatSessionsCache.set(
    chatSessionsCacheKey(),
    [
      {
        id: data.id,
        name: data.name || "New Chat",
      },
      ...cached,
    ]
  );

  return data;

}


// ============================================================
export async function saveSessionMessage(
  session_id: string,
  message: {
    role: "user" | "assistant";
    content: string;
    sources?: any[];
    video?: string;
  }
) {
  const res = await fetch(
    `${BASE}/api/sessions/${session_id}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(message),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to save chat message"
    );
  }

  const cacheKey =
    chatMessagesCacheKey(session_id);

  const cached =
    chatMessagesCache.get(cacheKey) || [];

  updateChatMessagesCache(
    session_id,
    [
      ...cached,
      message,
    ]
  );

  return data;
}


export async function getSessions() {
  const cacheKey =
    chatSessionsCacheKey();

  const cached =
    chatSessionsCache.get(cacheKey);

  const refresh = fetch(
    `${BASE}/api/sessions`,
    {
      headers: getAuthHeaders(),
      cache: "no-store",
    }
  )
    .then(async (res) => {
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.detail ||
          data?.message ||
          "Failed to load chat sessions"
        );
      }

      const normalized =
        Array.isArray(data) ? data : [];

      chatSessionsCache.set(
        cacheKey,
        normalized
      );

      return normalized;
    });

  if (cached) {
    refresh.catch((error) => {
      console.error(
        "Background chat session refresh failed:",
        error
      );
    });

    return cached;
  }

  return refresh;
}


export async function renameSession(
  session_id: string,
  name: string
) {
  const res = await fetch(
    `${BASE}/api/sessions/${session_id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ name }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to rename chat"
    );
  }

  const key =
    chatSessionsCacheKey();

  const cached =
    chatSessionsCache.get(key);

  if (cached) {
    chatSessionsCache.set(
      key,
      cached.map((chat) =>
        chat.id === session_id
          ? {
              ...chat,
              name:
                data.name ||
                name ||
                "New Chat",
            }
          : chat
      )
    );
  }

  return data;
}


export async function deleteSession(
  session_id: string
) {
  const res = await fetch(
    `${BASE}/api/sessions/${session_id}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to delete chat"
    );
  }

  const sessionKey =
    chatMessagesCacheKey(session_id);

  chatMessagesCache.delete(
    sessionKey
  );

  const sessionsKey =
    chatSessionsCacheKey();

  const cached =
    chatSessionsCache.get(sessionsKey);

  if (cached) {
    chatSessionsCache.set(
      sessionsKey,
      cached.filter(
        (chat) => chat.id !== session_id
      )
    );
  }

  return data;
}


// ============================================================
// 
// ============================================================

export async function uploadImage(
  file: File
) {

  const form = new FormData();

  form.append(
    "file",
    file
  );


  const res = await fetch(
    `${BASE}/api/upload-image`,
    {
      method: "POST",

      headers: getAuthHeaders(),

      body: form,
    }
  );


  const data = await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      data?.message ||
      "Image upload failed"
    );

  }


  return data;

}


// ============================================================
// DIAGNOSE IMAGE
// ============================================================

export async function diagnoseImage(
  file: File
) {

  const form = new FormData();

  form.append(
    "file",
    file
  );


  const res = await fetch(
    `${BASE}/api/diagnose-image`,
    {
      method: "POST",

      headers: getAuthHeaders(),

      body: form,
    }
  );


  const data = await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      data?.message ||
      "Image diagnosis failed"
    );

  }


  return data;

}