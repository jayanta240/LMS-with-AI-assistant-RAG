"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Check,
  ImagePlus,
  Palette,
  Save,
  Upload,
} from "lucide-react";

import DashboardLayout from "@/components/layout/DashboardLayout";

import {
  getCompanyBranding,
  updateCompanyBranding,
  uploadCompanyLogo,
} from "@/lib/course-api";

import {
  useBranding,
} from "@/components/providers/BrandThemeProvider";


type Branding = {
  company_id: number;
  logo_url: string;
  logo_public_id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
};


export default function BrandingPage() {

  const {
    refreshBranding,
  } = useBranding();


  const [branding, setBranding] =
    useState<Branding | null>(null);


  const [primaryColor, setPrimaryColor] =
    useState("#FBBF24");


  const [secondaryColor, setSecondaryColor] =
    useState("#0F172A");


  const [accentColor, setAccentColor] =
    useState("#F59E0B");


  const [logoPreview, setLogoPreview] =
    useState("");


  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);


  const [loading, setLoading] =
    useState(true);


  const [uploading, setUploading] =
    useState(false);


  const [saving, setSaving] =
    useState(false);


  const [message, setMessage] =
    useState("");


  // ==========================================================
  // LOAD BRANDING
  // ==========================================================

  useEffect(() => {
    loadBranding();
  }, []);


  async function loadBranding() {

    try {

      setLoading(true);

      const response =
        await getCompanyBranding();

      const data =
        response?.branding;


      if (!data) {
        return;
      }


      setBranding(data);


      setPrimaryColor(
        data.primary_color ||
          "#FBBF24"
      );


      setSecondaryColor(
        data.secondary_color ||
          "#0F172A"
      );


      setAccentColor(
        data.accent_color ||
          "#F59E0B"
      );


      setLogoPreview(
        data.logo_url || ""
      );


    } catch (error) {

      console.error(
        "Failed to load branding:",
        error
      );


      setMessage(
        "Unable to load company branding."
      );


    } finally {

      setLoading(false);

    }
  }


  // ==========================================================
  // SELECT LOGO
  // ==========================================================

  function handleLogoSelect(
    event: React.ChangeEvent<HTMLInputElement>
  ) {

    const file =
      event.target.files?.[0];


    if (!file) {
      return;
    }


    // Basic frontend validation

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/svg+xml",
    ];


    if (
      !allowedTypes.includes(
        file.type
      )
    ) {

      setMessage(
        "Please select a PNG, JPG, WEBP or SVG image."
      );

      return;
    }


    if (
      file.size >
      5 * 1024 * 1024
    ) {

      setMessage(
        "Logo must be smaller than 5 MB."
      );

      return;
    }


    setSelectedFile(file);


    const previewUrl =
      URL.createObjectURL(file);


    setLogoPreview(previewUrl);

  }


  // ==========================================================
  // UPLOAD LOGO
  // ==========================================================

  async function handleUploadLogo() {

    if (!selectedFile) {
      return;
    }


    try {

      setUploading(true);
      setMessage("");


      const response =
        await uploadCompanyLogo(
          selectedFile
        );


      const data =
        response?.branding;


      if (data) {

        setBranding(data);


        setLogoPreview(
          data.logo_url || ""
        );


        setPrimaryColor(
          data.primary_color ||
            primaryColor
        );


        setSecondaryColor(
          data.secondary_color ||
            secondaryColor
        );


        setAccentColor(
          data.accent_color ||
            accentColor
        );

      }


      /*
       * Refresh the global theme immediately.
       *
       * This makes the new company logo available
       * throughout the application without waiting
       * for the 30-second background refresh.
       */

      await refreshBranding();


      setSelectedFile(null);


      setMessage(
        "Logo uploaded successfully."
      );


    } catch (error: any) {

      console.error(
        "Logo upload failed:",
        error
      );


      setMessage(
        error?.message ||
          "Failed to upload logo."
      );


    } finally {

      setUploading(false);

    }
  }


  // ==========================================================
  // SAVE COLORS
  // ==========================================================

  async function handleSaveColors() {

    try {

      setSaving(true);
      setMessage("");


      const response =
        await updateCompanyBranding({

          primary_color:
            primaryColor,

          secondary_color:
            secondaryColor,

          accent_color:
            accentColor,

        });


      if (response?.branding) {

        setBranding(
          response.branding
        );

      }


      /*
       * Immediately refresh global branding.
       */

      await refreshBranding();


      setMessage(
        "Branding saved successfully."
      );


    } catch (error: any) {

      console.error(
        "Branding update failed:",
        error
      );


      setMessage(
        error?.message ||
          "Failed to save branding."
      );


    } finally {

      setSaving(false);

    }
  }


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (
      <DashboardLayout>

        <div className="flex min-h-[500px] items-center justify-center">

          <div className="text-center">

            <div
              className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200"
              style={{
                borderTopColor:
                  "var(--brand-primary)",
              }}
            />

            <p className="mt-4 text-sm text-slate-500">
              Loading branding...
            </p>

          </div>

        </div>

      </DashboardLayout>
    );
  }


  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <DashboardLayout>

      <div className="space-y-6">

        {/* =====================================================
            HEADER
           ===================================================== */}

        <div>

          <p
            className="text-sm font-semibold"
            style={{
              color:
                "var(--brand-accent)",
            }}
          >
            Company Settings
          </p>


          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Branding
          </h1>


          <p className="mt-2 text-sm text-slate-500">
            Customize your company's logo and visual identity
            across the learning platform.
          </p>

        </div>


        {/* =====================================================
            MESSAGE
           ===================================================== */}

        {message && (

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">

            <Check
              size={17}
              className="text-emerald-500"
            />

            {message}

          </div>

        )}


        {/* =====================================================
            LOGO CARD
           ===================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-6 py-5">

            <div className="flex items-center gap-3">

              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--brand-primary) 10%, white)",
                  color:
                    "var(--brand-primary)",
                }}
              >
                <ImagePlus size={20} />
              </div>


              <div>

                <h2 className="font-semibold text-slate-900">
                  Company Logo
                </h2>

                <p className="text-sm text-slate-500">
                  Upload the logo that should appear throughout your LMS.
                </p>

              </div>

            </div>

          </div>


          <div className="grid gap-8 p-6 lg:grid-cols-2">

            {/* Preview */}

            <div>

              <p className="mb-3 text-sm font-semibold text-slate-700">
                Current Logo
              </p>


              <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50">

                {logoPreview ? (

                  <img
                    src={logoPreview}
                    alt="Company logo"
                    className="max-h-32 max-w-[260px] object-contain"
                  />

                ) : (

                  <div className="text-center">

                    <ImagePlus
                      size={32}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-2 text-sm text-slate-400">
                      No company logo uploaded
                    </p>

                  </div>

                )}

              </div>

            </div>


            {/* Upload */}

            <div className="flex flex-col justify-center">

              <p className="text-sm font-semibold text-slate-700">
                Upload New Logo
              </p>


              <p className="mt-1 text-xs leading-5 text-slate-500">
                PNG, JPG, WEBP or SVG.
                Maximum file size: 5 MB.
              </p>


              <label
                className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >

                <Upload size={17} />

                Choose Logo

                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.svg"
                  onChange={
                    handleLogoSelect
                  }
                  disabled={uploading}
                  className="hidden"
                />

              </label>


              {selectedFile && (

                <div
                  className="mt-3 rounded-xl px-4 py-3 text-xs text-slate-700"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--brand-accent) 10%, white)",
                  }}
                >

                  <p className="font-semibold">
                    Selected file
                  </p>

                  <p className="mt-1 truncate">
                    {selectedFile.name}
                  </p>

                </div>

              )}


              <button
                type="button"
                onClick={
                  handleUploadLogo
                }
                disabled={
                  !selectedFile ||
                  uploading
                }
                className="
                  mt-4
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  px-5
                  py-3
                  text-sm
                  font-semibold
                  shadow-sm
                  transition
                  hover:opacity-90
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
                style={{
                  backgroundColor:
                    "var(--brand-primary)",
                  color:
                    "var(--brand-primary-text)",
                }}
              >

                <Upload size={17} />

                {uploading
                  ? "Uploading..."
                  : "Upload Logo"}

              </button>

            </div>

          </div>

        </div>


        {/* =====================================================
            COLORS
           ===================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-6 py-5">

            <div className="flex items-center gap-3">

              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--brand-primary) 10%, white)",
                  color:
                    "var(--brand-primary)",
                }}
              >
                <Palette size={20} />
              </div>


              <div>

                <h2 className="font-semibold text-slate-900">
                  Brand Colors
                </h2>

                <p className="text-sm text-slate-500">
                  These colors will be used across your company's interface.
                </p>

              </div>

            </div>

          </div>


          <div className="p-6">

            <div className="grid gap-5 md:grid-cols-3">

              {/* =================================================
                  PRIMARY
                 ================================================= */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Primary Color
                </label>


                <div className="flex items-center gap-3">

                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) =>
                      setPrimaryColor(
                        e.target.value
                      )
                    }
                    className="h-11 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                  />


                  <input
                    value={primaryColor}
                    onChange={(e) =>
                      setPrimaryColor(
                        e.target.value
                      )
                    }
                    className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm uppercase text-slate-700 outline-none"
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--brand-primary) 25%, #e2e8f0)",
                    }}
                  />

                </div>

              </div>


              {/* =================================================
                  SECONDARY
                 ================================================= */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Secondary Color
                </label>


                <div className="flex items-center gap-3">

                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) =>
                      setSecondaryColor(
                        e.target.value
                      )
                    }
                    className="h-11 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                  />


                  <input
                    value={secondaryColor}
                    onChange={(e) =>
                      setSecondaryColor(
                        e.target.value
                      )
                    }
                    className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm uppercase text-slate-700 outline-none"
                  />

                </div>

              </div>


              {/* =================================================
                  ACCENT
                 ================================================= */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Accent Color
                </label>


                <div className="flex items-center gap-3">

                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) =>
                      setAccentColor(
                        e.target.value
                      )
                    }
                    className="h-11 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                  />


                  <input
                    value={accentColor}
                    onChange={(e) =>
                      setAccentColor(
                        e.target.value
                      )
                    }
                    className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm uppercase text-slate-700 outline-none"
                  />

                </div>

              </div>

            </div>


            {/* =================================================
                PREVIEW
               ================================================= */}

            <div className="mt-8 rounded-2xl border border-slate-200 p-5">

              <p className="mb-4 text-sm font-semibold text-slate-700">
                Theme Preview
              </p>


              <div className="flex flex-wrap items-center gap-3">

                <button
                  type="button"
                  style={{
                    backgroundColor:
                      primaryColor,
                    color: "#FFFFFF",
                  }}
                  className="rounded-xl px-5 py-3 text-sm font-semibold shadow-sm"
                >
                  Primary Button
                </button>


                <button
                  type="button"
                  style={{
                    backgroundColor:
                      secondaryColor,
                    color: "#FFFFFF",
                  }}
                  className="rounded-xl px-5 py-3 text-sm font-semibold shadow-sm"
                >
                  Secondary Button
                </button>


                <span
                  style={{
                    backgroundColor:
                      accentColor,
                  }}
                  className="rounded-full px-4 py-2 text-xs font-bold text-slate-900"
                >
                  Accent
                </span>

              </div>

            </div>


            {/* =================================================
                SAVE
               ================================================= */}

            <div className="mt-6 flex justify-end">

              <button
                type="button"
                onClick={
                  handleSaveColors
                }
                disabled={saving}
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  px-6
                  py-3
                  text-sm
                  font-semibold
                  shadow-sm
                  transition
                  hover:opacity-90
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
                style={{
                  backgroundColor:
                    "var(--brand-primary)",
                  color:
                    "var(--brand-primary-text)",
                }}
              >

                <Save size={17} />

                {saving
                  ? "Saving..."
                  : "Save Branding"}

              </button>

            </div>

          </div>

        </div>

      </div>

    </DashboardLayout>
  );
}