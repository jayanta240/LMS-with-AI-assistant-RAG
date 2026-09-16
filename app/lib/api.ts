const BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";


// ============================================================
// AUTH HEADER
// ============================================================

function getAuthHeaders() {

  const token = localStorage.getItem("token");

  return {
    Authorization: `Bearer ${token}`,
  };

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

  const data = await res.json();

  if (!res.ok) {

    throw new Error(
      data?.detail ||
      data?.message ||
      "Chat request failed"
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

  const res = await fetch(
    `${BASE}/api/sessions/${session_id}/messages`,
    {
      headers: getAuthHeaders(),
    }
  );


  const data = await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to load messages"
    );

  }


  return data;

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


  return data;

}


// ============================================================
// UPLOAD IMAGE
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