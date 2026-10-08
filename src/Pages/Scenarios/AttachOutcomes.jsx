import React, { useState } from 'react';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import OutcomeRichTextEditorModal from './OutcomeRichTextEditorModal';
import imageCatalogue from "./imageCatalogue.json";
import initialLandingCatalogues from '../LandingPageCatalogue/LandingPageCatalogues.json';
//import TrainingPathGrid from '../StartCampaign/AddTrainingPath';
import TrainingPathGrid from './TrainingPathGrid';

import {
  ChevronRight,
  Check,
  Link2,
  Image as ImageIcon,
  X,
  Eye,
  CheckCircle2,
  Award,
  Upload,
  Play,
  CircleHelp,
} from 'lucide-react';


/* ============================================================
   COVER IMAGE DROPZONE
============================================================ */

const CoverImageDropzone = ({ onClick, isDark }) => (
  <div
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        onClick();
      }
    }}
    className={`
      w-full mx-auto h-[150px]
      rounded-lg border-2 border-dashed
      flex flex-col items-center justify-center gap-2
      cursor-pointer transition-all
      ${
        isDark
          ? 'border-white/25 bg-white/5 hover:bg-white/10 hover:border-white/50'
          : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400'
      }
    `}
  >
    <Upload
      className={`w-6 h-6 ${
        isDark ? 'text-white/70' : 'text-slate-500'
      }`}
    />

    <span
      className={`
        text-[10px] font-bold uppercase tracking-wide
        ${isDark ? 'text-white' : 'text-slate-800'}
      `}
    >
      Click here
    </span>
  </div>
);


/* ============================================================
   SELECTED TRAINING PREVIEW

   This receives the complete training object selected from
   TrainingPathGrid and displays the selected training inside
   Attach Outcomes.
============================================================ */

const SelectedTrainingPreview = ({ formData, onRedo, isDark }) => {
  const training = formData?.selectedTrainingPath;

  if (!training) {
    return null;
  }

  /* ----------------------------------------------------------
     TRAINING ID
  ---------------------------------------------------------- */

  const trainingId =
    training.TrainingPathID ||
    training.trainingCode ||
    training.id ||
    '';


  /* ----------------------------------------------------------
     TRAINING NAME
  ---------------------------------------------------------- */

  const trainingName =
    training.TrainingPathName ||
    training.title ||
    'Training Path';


  /* ----------------------------------------------------------
     DESCRIPTION
  ---------------------------------------------------------- */

  const description =
    training.Description ||
    training.description ||
    '';


  /* ----------------------------------------------------------
     RESOLVED VIDEOS

     TrainingPathGrid creates resolvedVideos from the original
     TrainingVideoAttached IDs.
  ---------------------------------------------------------- */

  const videos = Array.isArray(training.resolvedVideos)
    ? training.resolvedVideos
    : [];


  /* ----------------------------------------------------------
     QUESTION COUNT
  ---------------------------------------------------------- */

  const questionCount =
    training.questionCount ??
    training.questions ??
    0;


  /* ----------------------------------------------------------
     PASSING SCORE
  ---------------------------------------------------------- */

  const passingScore =
    training.passingScore ??
    80;


  /* ----------------------------------------------------------
     CERTIFICATE
  ---------------------------------------------------------- */

  const certificate =
    training.resolvedCertificate ||
    training.certificate;


  /* ----------------------------------------------------------
     COVER IMAGE
  ---------------------------------------------------------- */

  const coverImage =
    training['Thumbnail(CoverImage)'] ||
    training.ThumbnailCoverImage ||
    training.coverImage ||
    'CovImg-001.png';


  let coverSrc = '';

  try {
    coverSrc = new URL(
      `../Scenarios/`+coverImage,
      import.meta.url
    ).href;
  } catch {
    coverSrc = `/assets/Scenarios/${coverImage}`;
  }


  return (
    <div
      className="
        relative
        w-full
        rounded-lg
        overflow-hidden
        border
        border-slate-200
        dark:border-white/10
        bg-black
        text-white
        shadow-sm
        h-[210px]
      "
    >

      {/* ======================================================
          REDO BUTTON
      ====================================================== */}

      <button
        type="button"
        onClick={onRedo}
        className={`
          absolute
          top-2
          right-2
          z-10
          px-2.5
          h-[24px]
          rounded-md
          text-[8px]
          font-bold
          transition-all

          ${
            isDark
              ? 'bg-white text-black hover:bg-slate-200'
              : 'bg-[#06080D] text-white hover:bg-slate-800'
          }
        `}
      >
        ↻ Redo
      </button>


      {/* ======================================================
          TRAINING CARD
      ====================================================== */}

      <div className="relative h-[200px] p-3.5 overflow-hidden">

        {/* ====================================================
            TOP SECTION
        ==================================================== */}

        <div className="relative z-10 flex items-center justify-between">

          {/* TRAINING ID */}

          <div
            className="
              inline-flex
              items-center
              gap-1.5
              px-2.5
              py-0.5
              rounded-full
              text-[9px]
              font-bold
              bg-white/80
              text-black
            "
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />

            <span>
              {trainingId}
            </span>
          </div>


          {/* CREATED DATE */}

          {training.CreatedOn && (
            <span className="text-[8px] text-white/70">
              Created on: {training.CreatedOn}
            </span>
          )}

        </div>


        {/* ====================================================
            TITLE + DESCRIPTION
        ==================================================== */}

        <div
          className="
            relative
            z-10
            mt-4
            max-w-[70%]
            text-left
          "
        >

          <h3
            className="
              text-[13px]
              font-voda
              font-bold
              text-white
              leading-tight
              mb-2
            "
          >
            {trainingName}
          </h3>


          <p
            className="
              text-[8.5px]
              text-white/75
              leading-relaxed
              line-clamp-3
            "
          >
            <strong>Description: </strong>

            {description || 'No description available.'}
          </p>

        </div>


        {/* ====================================================
            STATS
        ==================================================== */}

        <div
          className="
            absolute
            left-3.5
            bottom-3.5
            z-20
            flex
            items-center
            gap-2
          "
        >

          {/* ==================================================
              VIDEOS
          ================================================== */}

          <div
            className="
              flex
              items-center
              gap-1.5
              px-2
              py-1
              rounded-md
              bg-white/10
              border
              border-white/10
            "
          >

            <Play className="w-3 h-3" />

            <div className="flex flex-col leading-none">

              <span className="text-[8px] font-bold">
                {videos.length} Videos
              </span>

              <span className="text-[7px] text-white/60">
                Training
              </span>

            </div>

          </div>


          {/* ==================================================
              QUIZ
          ================================================== */}

          <div
            className="
              flex
              items-center
              gap-1.5
              px-2
              py-1
              rounded-md
              bg-white/10
              border
              border-white/10
            "
          >

            <CircleHelp className="w-3 h-3" />

            <div className="flex flex-col leading-none">

              <span className="text-[8px] font-bold">
                1 Quiz
              </span>

              <span className="text-[7px] text-white/60">
                {questionCount} Qs
              </span>

            </div>

          </div>


          {/* ==================================================
              CERTIFICATE
          ================================================== */}

          <div
            className="
              flex
              items-center
              gap-1.5
              px-2
              py-1
              rounded-md
              bg-white/10
              border
              border-white/10
            "
          >

            <Award className="w-3 h-3" />

            <div className="flex flex-col leading-none">

              <span className="text-[8px] font-bold">
                {certificate ? '1 Cert' : 'No Cert'}
              </span>

              <span className="text-[7px] text-white/60">
                Pass: {passingScore}%
              </span>

            </div>

          </div>

        </div>


        {/* ====================================================
            COVER IMAGE
        ==================================================== */}

        <div
          className="
            absolute
            -right-[5%]
            -bottom-[8%]
            w-[110px]
            h-[110px]
            pointer-events-none
            flex
            items-center
            justify-center
          "
        >

          <img
            src={coverSrc}
            alt={trainingName}
            className="
              w-full
              h-full
              object-contain
              filter
              drop-shadow-md
            "
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />

        </div>

      </div>

    </div>
  );
};


/* ============================================================
   RICH TEXT PREVIEW
============================================================ */

const OutcomeRichTextPreview = ({
  content,
  onRedo,
}) => {
  if (!content) {
    return null;
  }

  const previewDocument = `
    <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #ffffff;
          }

          * {
            box-sizing: border-box;
          }
        </style>
      </head>

      <body>
        ${content}
      </body>
    </html>
  `;

  return (
    <div className="mt-4 flex justify-center">

      <div
        className="
          relative
          w-full
          h-[200px]
          p-3
          rounded-lg
          overflow-hidden
          border
          border-white/20
          bg-white/5
          shadow-lg
        "
      >

        {/* REDO */}

        <button
          type="button"
          onClick={onRedo}
          className="
            absolute
            top-2
            right-2
            z-10
            px-2
            h-[24px]
            rounded-md
            bg-black/70
            text-white
            text-[8px]
            font-bold
            hover:bg-black
            transition-all
          "
        >
          ↻ Redo
        </button>


        {/* PREVIEW */}

        <iframe
          title="Custom Outcome Preview"
          srcDoc={previewDocument}
          className="
            w-full
            h-full
            border-0
            rounded-md
            bg-white
          "
        />

      </div>

    </div>
  );
};

/* ============================================================
   SELECTED LANDING PAGE PREVIEW

   Uses the same design as the Landing Page Catalogue popup.

   Difference:
   - Popup: Select button
   - Main preview: Redo button
============================================================ */

const LandingPageSelectedPreview = ({
  itemId,
  itemName,
  itemContent,
  onRedo,
  isDark,
}) => {

  if (!itemContent) {
    return null;
  }


  return (
    <div
      className="
        relative
        rounded-xl
        overflow-hidden
        border
        border-slate-200
        dark:border-white/10
        shadow-sm
        flex
        flex-col
        justify-between
        h-[210px]
        w-full
        bg-white
        dark:bg-[#1A1C23]
      "
    >

      {/* ======================================================
          LANDING PAGE PREVIEW
      ====================================================== */}

      <div
        className="
          absolute
          inset-0
          w-full
          h-full
          pointer-events-none
          overflow-hidden
          z-0
        "
      >

        <iframe
          title={itemName || 'Selected Landing Page'}
          srcDoc={`
            <!DOCTYPE html>
            <html>

              <head>

                <meta charset="utf-8"/>

                <meta
                  name="viewport"
                  content="width=device-width, initial-scale=1"
                />

                <style>

                  html,
                  body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    font-family:
                      'Segoe UI',
                      Arial,
                      sans-serif;
                    background: #ffffff;
                  }

                  * {
                    box-sizing: border-box;
                  }

                </style>

              </head>

              <body>
                ${itemContent}
              </body>

            </html>
          `}
          className="
            w-[200%]
            h-[200%]
            border-none
          "
          style={{
            transform: 'scale(0.5)',
            transformOrigin: 'top left',
          }}
          sandbox="allow-same-origin"
        />

      </div>


      {/* ======================================================
          TOP BADGE
      ====================================================== */}

      <div
        className="
          relative
          z-10
          p-2.5
          flex
          items-center
          justify-between
        "
      >

        {/* LANDING PAGE ID */}

        <span
          className="
            px-2
            py-0.5
            rounded
            text-[10px]
            font-mono
            font-bold
            bg-black
            text-white
            dark:bg-white
            dark:text-black
            shadow-xs
          "
        >
          {itemId}
        </span>


        <button
          type="button"
          onClick={onRedo}
          className={`
          absolute
          top-2
          right-2
          z-10
          px-2.5
          h-[24px]
          rounded-md
          text-[8px]
          font-bold
          transition-all

          ${
            isDark
              ? 'bg-white text-black hover:bg-slate-200'
              : 'bg-[#06080D] text-white hover:bg-slate-800'
          }
        `}
        >

          <span>
            ↻ Redo
          </span>

        </button>

      </div>


      {/* ======================================================
          FOOTER
      ====================================================== */}

      <div
        className="
          relative
          z-10
          m-2
          p-2
          px-3
          rounded-lg
          bg-white/90
          dark:bg-black/80
          backdrop-blur-xs
          border
          border-black/10
          dark:border-white/10
          flex
          items-center
          justify-between
          gap-2
        "
      >

        {/* ====================================================
            NAME
        ==================================================== */}

        <div
          className="
            flex
            flex-col
            min-w-0
            flex-1
          "
        >

          <span
            className="
              text-[11px]
              font-voda
              font-bold
              truncate
              text-slate-900
              dark:text-white
            "
            title={itemName}
          >
            {itemName}
          </span>


          <span
            className="
              text-[8px]
              text-slate-500
              dark:text-slate-400
              mt-0.5
            "
          >
            Landing Page
          </span>

        </div>

      </div>

    </div>
  );
};
/* ============================================================
   ATTACH OUTCOMES TAB
============================================================ */

const AttachOutcomesTab = ({
  formData,
  setFormData,
}) => {

  const { isDark } =
    useUserType?.() || { isDark: false };

  const shellBg = isDark
    ? '#1C1E24'
    : '#F1F5F7';


  const coverImageInputRef =
    React.useRef(null);


  const [
    isImageCatalogueOpen,
    setIsImageCatalogueOpen,
  ] = useState(false);


  const [
    isLandingPageCatalogueOpen,
    setIsLandingPageCatalogueOpen,
  ] = useState(false);


  const [
    isTrainingPathCatalogueOpen,
    setIsTrainingPathCatalogueOpen,
  ] = useState(false);


  const [
    isLandingPageBuilderOpen,
    setIsLandingPageBuilderOpen,
  ] = useState(false);


  const [
    isIndividualTrainingOpen,
    setIsIndividualTrainingOpen,
  ] = useState(false);


  const [
    isOutcomeEditorOpen,
    setIsOutcomeEditorOpen,
  ] = useState(false);


  /* ==========================================================
     SHARED DESIGN
  ========================================================== */

  const OUTCOME_SECTION_THEMES = {
    coverImage: {
      bgLight: '#ECE8FF',
      bgDark: '#22193E',
    },

    landingPage: {
      bgLight: '#FFEFCE',
      bgDark: '#2E200C',
    },

    training: {
      bgLight: '#CEFBEA',
      bgDark: '#0D271E',
    },
  };


  const landingPageCatalogue =
    initialLandingCatalogues?.landingPages || [];


  /* ==========================================================
     REDO TRAINING
  ========================================================== */

  const handleRedoTraining = () => {

    setFormData((previous) => ({
      ...previous,

      trainingSource: '',

      selectedTrainingPath: null,

      trainingPathId: null,

      trainingPathCode: '',

      trainingPathName: '',

      trainingPathVideos: 0,

      trainingPathDuration: '',

      trainingPathQuestions: 0,

      trainingPathCertificate: false,

      individualTraining: {
        videos: [],
        quiz: null,
        certificate: null,
      },
    }));

  };


  /* ==========================================================
     REDO INDIVIDUAL TRAINING
  ========================================================== */

  const handleRedoIndividualTraining = () => {

    setFormData((prev) => ({
      ...prev,

      trainingSource: '',

      selectedTrainingPath: null,

      individualTraining: {
        videos: [],
        quiz: null,
        certificate: null,
      },
    }));

  };


  /* ==========================================================
     COVER IMAGE CATALOGUE SELECT
  ========================================================== */

  const handleCatalogueImageSelect = (image) => {

    setFormData((previous) => ({
      ...previous,

      coverImageSource: 'catalogue',

      coverImage: null,

      coverImageName: image.title,

      coverImagePreview: image.image,

      selectedCatalogueImageId: image.id,
    }));

    setIsImageCatalogueOpen(false);
  };


  /* ==========================================================
     REDO COVER IMAGE
  ========================================================== */

  const handleRedoCoverImage = () => {

    setFormData((prev) => ({
      ...prev,

      coverImageSource: '',

      coverImage: null,

      coverImageName: '',

      coverImagePreview: '',

      selectedCatalogueImageId: null,
    }));

  };


  /* ==========================================================
     REDO LANDING PAGE
  ========================================================== */

  const handleRedoLandingPage = () => {

    setFormData((previous) => ({
      ...previous,

      outcomeSource: '',

      outcomeRichText: '',

      landingPageSource: '',

      landingPageContent: null,

      coverLandingImage: null,

      coverLandingImageName: '',

      coverLandingPagePreview: '',

      selectedLandingCatalogueImageId: null,
    }));

  };


  /* ==========================================================
     REDO CUSTOM OUTCOME
  ========================================================== */

  const handleRedoOutcome = () => {

    setFormData((previous) => ({
      ...previous,

      outcomeSource: '',

      outcomeRichText: '',
    }));

  };


  /* ============================================================
   LANDING PAGE SELECT
============================================================ */

const handleLandingPageImageSelect = (item) => {

  const landingPageId =
    item?.LandingPageID ||
    item?.landingPageId ||
    item?.id ||
    '';


  const landingPageName =
    item?.LandingPageName ||
    item?.landingPageName ||
    item?.name ||
    '';


  const landingPageContent =
    item?.LandingPageContent ||
    item?.landingPageContent ||
    item?.content ||
    '';


  setFormData((previous) => ({
    ...previous,

    landingPageSource: 'catalogue',

    landingPageContent: landingPageContent,

    selectedLandingCatalogueImageId:
      landingPageId,

    coverLandingImageName:
      landingPageName,

    coverLandingPagePreview: '',

    landingPagePreviewImage: '',
  }));


  setIsLandingPageCatalogueOpen(false);
};


  /* ==========================================================
     LANDING PAGE BUILDER SAVE
  ========================================================== */

  const handleLandingPageBuilderSave = (
    builderContent,
    previewImage
  ) => {

    setFormData((previous) => ({
      ...previous,

      landingPageSource: 'builder',

      landingPageContent: builderContent,

      landingPagePreviewImage: previewImage,

      coverLandingImageName: '',

      coverLandingPagePreview: '',

      selectedLandingCatalogueImageId: null,
    }));


    setIsLandingPageBuilderOpen(false);
  };


  /* ==========================================================
     TRAINING PATH SELECT
     
     IMPORTANT:
     Keep the COMPLETE training object received from
     TrainingPathGrid.
  ========================================================== */

  const handleTrainingPathSelect = (training) => {

    if (!training) {
      return;
    }


    console.log(
      'AttachOutcomes - Selected Training:',
      training
    );


    setFormData((previous) => ({
      ...previous,

      trainingSource: 'training-path',

      /* COMPLETE TRAINING OBJECT */
      selectedTrainingPath: training,

      /* NORMALIZED VALUES */
      trainingPathId:
        training.id ||
        training.TrainingPathID ||
        null,

      trainingPathCode:
        training.trainingCode ||
        training.TrainingPathID ||
        '',

      trainingPathName:
        training.title ||
        training.TrainingPathName ||
        '',

      trainingPathVideos:
        training.videos ||
        0,

      trainingPathDuration:
        training.duration ||
        training.Duration ||
        '',

      trainingPathQuestions:
        training.questions ||
        training.questionCount ||
        0,

      trainingPathCertificate:
        Boolean(
          training.certificate ||
          training.resolvedCertificate
        ),

      individualTraining: {
        videos: [],
        quiz: null,
        certificate: null,
      },
    }));


    setIsTrainingPathCatalogueOpen(false);
  };


  /* ==========================================================
     GENERIC FIELD UPDATE
  ========================================================== */

  const updateField = (
    field,
    value
  ) => {

    setFormData((previous) => ({
      ...previous,

      [field]: value,
    }));

  };


  /* ============================================================
     TRAINING PATH CATALOGUE MODAL

     IMPORTANT:
     No search.
     No Training ID dropdown.
     No Create New button.

     Only the AddTrainingPath-style grid is displayed.
  ============================================================ */

  const TrainingPathCatalogueModal = ({
    isOpen,
    onClose,
    onSelect,
  }) => {

    if (!isOpen) {
      return null;
    }


    return (
      <div
        className="
          fixed
          inset-0
          z-[9999]
          flex
          items-center
          justify-center
          p-4
          bg-black/70
          backdrop-blur-sm
        "
        onClick={onClose}
      >

        {/* ====================================================
            MODAL
        ==================================================== */}

        <div
          className="
            relative
            w-full
            max-w-[1100px]
            max-h-[90vh]
            rounded-xl
            bg-white
            dark:bg-[#15161a]
            border
            border-slate-200
            dark:border-white/10
            shadow-2xl
            overflow-hidden
          "
          onClick={(event) =>
            event.stopPropagation()
          }
        >

          {/* ==================================================
              HEADER
          ================================================== */}

          <div
            className="
              h-[58px]
              px-5
              flex
              items-center
              justify-between
              border-b
              border-slate-200
              dark:border-white/10
            "
          >

            <div className="flex items-center gap-3">

              <div
                className="
                  w-9
                  h-9
                  rounded-lg
                  bg-[#990099]/10
                  flex
                  items-center
                  justify-center
                "
              >

                <Award
                  className="
                    w-4
                    h-4
                    text-[#990099]
                  "
                />

              </div>


              <div>

                <h2
                  className="
                    text-[13px]
                    font-voda-exb
                    uppercase
                    tracking-tight
                    text-slate-900
                    dark:text-white
                  "
                >
                  Attach Training Path
                </h2>


                <p
                  className="
                    text-[8px]
                    text-slate-500
                    dark:text-slate-400
                  "
                >
                  Select a training path for this scenario
                </p>

              </div>

            </div>


            {/* CLOSE */}

            <button
              type="button"
              onClick={onClose}
              className="
                w-[22px]
                h-[22px]
                rounded-md
                flex
                items-center
                justify-center
                text-slate-500
                hover:bg-slate-100
                hover:text-slate-900
                transition-all
                dark:text-white
                dark:hover:bg-white/10
              "
            >

              <X className="w-3.5 h-3.5" />

            </button>

          </div>


          {/* ==================================================
              TRAINING GRID ONLY
              
              Search / Training ID / Create New removed.
          ================================================== */}

          <div
            className="
              px-4
              py-5
              overflow-y-auto
              max-h-[calc(90vh-58px)]
            "
          >

            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                lg:grid-cols-3
                gap-4
              "
            >

              <TrainingPathGrid
                onSelect={onSelect}
              />

            </div>

          </div>

        </div>

      </div>
    );
  };


  /* ============================================================
     ATTACH BUTTON
  ============================================================ */

  const AttachButton = ({
    icon: Icon,
    label,
    onClick,
    variant = 'primary',
    isDark,
  }) => (

    <button
      type="button"
      onClick={onClick}
      className={`
        w-full
        max-w-[220px]
        mx-auto
        h-[38px]
        px-4
        rounded-lg
        text-[9px]
        font-bold
        uppercase
        tracking-wide
        flex
        items-center
        justify-center
        gap-2
        transition-all
        cursor-pointer

        ${
          variant === 'primary'
            ? isDark
              ? 'bg-white text-black hover:bg-slate-200'
              : 'bg-[#06080D] text-white hover:bg-slate-800'
            : isDark
              ? 'bg-white/10 text-white border border-white/15 hover:bg-white/15'
              : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50'
        }
      `}
    >

      {Icon && (
        <Icon className="w-3.5 h-3.5" />
      )}

      <span>
        {label}
      </span>

    </button>
  );


  /* ============================================================
     OR DIVIDER
  ============================================================ */

  const OrDivider = ({
    isDark,
  }) => (

    <div className="flex items-center gap-2 my-3">

      <span
        className={`
          flex-1
          h-px
          ${isDark
            ? 'bg-white/10'
            : 'bg-slate-200'
          }
        `}
      />

      <span
        className="
          text-[8px]
          font-voda-exb
          uppercase
          text-slate-400
        "
      >
        Or
      </span>

      <span
        className={`
          flex-1
          h-px
          ${isDark
            ? 'bg-white/10'
            : 'bg-slate-200'
          }
        `}
      />

    </div>
  );


  /* ============================================================
     PREVIEW CARD SHELL
  ============================================================ */

  const PreviewCardShell = ({
    onRedo,
    footer,
    children,
    isDark,
  }) => (

    <div
      className={`
        relative
        w-full
        mx-auto
        rounded-lg
        overflow-hidden
        border
        h-[210px]
        ${
          isDark
            ? 'border-white/10 bg-white/5'
            : 'border-slate-200 bg-slate-50'
        }
      `}
    >

      <button
        type="button"
        onClick={onRedo}
        className={`
          absolute
          top-2
          right-2
          z-10
          px-2.5
          h-[24px]
          rounded-md
          text-[8px]
          font-bold
          transition-all

          ${
            isDark
              ? 'bg-white text-black hover:bg-slate-200'
              : 'bg-[#06080D] text-white hover:bg-slate-800'
          }
        `}
      >
        ↻ Redo
      </button>


      {children}


      {footer && (

        <div
          className={`
            px-3
            py-2
            border-t
            text-[8px]
            font-semibold
            truncate

            ${
              isDark
                ? 'border-white/10 text-slate-300'
                : 'border-slate-200 text-slate-600'
            }
          `}
        >
          {footer}
        </div>

      )}

    </div>
  );


  /* ============================================================
     IMAGE CATALOGUE MODAL
  ============================================================ */

  const ImageCatalogueModal = ({
    isOpen,
    onClose,
    onSelect,
  }) => {

    if (!isOpen) {
      return null;
    }


    return (
      <div
        className="
          fixed
          inset-0
          z-[9999]
          flex
          items-center
          justify-center
          p-4
          bg-black/70
          backdrop-blur-sm
        "
        onClick={onClose}
      >

        <div
          className="
            relative
            w-full
            max-w-[900px]
            max-h-[85vh]
            rounded-xl
            bg-white
            dark:bg-[#15161a]
            border
            border-slate-200
            dark:border-white/10
            shadow-2xl
            overflow-hidden
          "
          onClick={(event) =>
            event.stopPropagation()
          }
        >

          {/* HEADER */}

          <div
            className="
              h-[58px]
              px-5
              flex
              items-center
              justify-between
              border-b
              border-slate-200
              dark:border-white/10
            "
          >

            <div>

              <h2
                className="
                  text-[13px]
                  font-voda-exb
                  uppercase
                  tracking-tight
                  text-slate-900
                  dark:text-white
                "
              >
                Cover Image Catalogue
              </h2>

            </div>


            <button
              type="button"
              onClick={onClose}
              className="
                w-7
                h-7
                rounded-md
                flex
                items-center
                justify-center
                text-slate-500
                hover:bg-slate-100
                dark:hover:bg-white/10
                dark:text-slate-300
                transition-all
              "
            >

              <X className="w-4 h-4" />

            </button>

          </div>


          {/* CONTENT */}

          <div
            className="
              p-5
              overflow-y-auto
              max-h-[calc(85vh-58px)]
            "
          >

            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                lg:grid-cols-4
                gap-4
              "
            >

              {imageCatalogue.map((item) => (

                <div
                  key={item.id}
                  className="
                    rounded-lg
                    border
                    border-slate-200
                    dark:border-white/10
                    bg-white
                    dark:bg-[#202127]
                    overflow-hidden
                    transition-all
                    hover:shadow-md
                    hover:border-slate-300
                    dark:hover:border-white/20
                  "
                >

                  {/* IMAGE */}

                  <div
                    className="
                      w-full
                      h-[135px]
                      bg-slate-100
                      dark:bg-[#18191f]
                      overflow-hidden
                    "
                  >

                    <img
                      src={item.image}
                      alt={item.title}
                      className="
                        w-full
                        h-full
                        object-cover
                        transition-transform
                        duration-300
                        hover:scale-[1.03]
                      "
                    />

                  </div>


                  {/* CONTENT */}

                  <div className="p-3">

                    <h3
                      className="
                        text-[10px]
                        font-voda-exb
                        uppercase
                        text-slate-900
                        dark:text-white
                        truncate
                      "
                      title={item.title}
                    >
                      {item.title}
                    </h3>


                    <div className="grid grid-cols-2 gap-2 mt-3">

                      {/* PREVIEW */}

                      <button
                        type="button"
                        className="
                          h-[30px]
                          rounded-md
                          border
                          border-slate-300
                          dark:border-white/10
                          bg-white
                          dark:bg-[#18191f]
                          text-slate-700
                          dark:text-slate-300
                          text-[8px]
                          font-bold
                          uppercase
                          flex
                          items-center
                          justify-center
                          gap-1
                          hover:bg-slate-100
                          dark:hover:bg-white/10
                          transition-all
                        "
                      >

                        <Eye className="w-3 h-3" />

                        Preview

                      </button>


                      {/* SELECT */}

                      <button
                        type="button"
                        onClick={() =>
                          onSelect(item)
                        }
                        className="
                          h-[30px]
                          rounded-md
                          bg-[#06080D]
                          text-white
                          text-[8px]
                          font-bold
                          uppercase
                          flex
                          items-center
                          justify-center
                          gap-1
                          hover:opacity-90
                          transition-all
                        "
                      >

                        <CheckCircle2 className="w-3 h-3" />

                        Select

                      </button>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </div>

        </div>

      </div>
    );
  };


  /* ============================================================
     LANDING PAGE CATALOGUE MODAL
  ============================================================ */

  const LandingPageCatalogueModal = ({
    isOpen,
    onClose,
    onSelect,
    selectedLandingPageId,
    isDark,
  }) => {

    if (!isOpen) {
      return null;
    }


    const getItemId = (item) =>
      item?.LandingPageID ||
      item?.landingPageId ||
      item?.id ||
      '';


    const getItemName = (item) =>
      item?.LandingPageName ||
      item?.landingPageName ||
      item?.name ||
      '';


    const getItemContent = (item) =>
      item?.LandingPageContent ||
      item?.landingPageContent ||
      item?.content ||
      '';


    return (
      <div
        className="
          fixed
          inset-0
          z-[9999]
          bg-black/80
          backdrop-blur-sm
          flex
          items-center
          justify-center
          p-6
        "
        onClick={onClose}
      >

        <div
          className="
            w-full
            max-w-5xl
            max-h-[85vh]
            rounded-2xl
            overflow-hidden
            flex
            flex-col
            shadow-2xl
            border
            border-white/15
            bg-white
            dark:bg-[#181A20]
          "
          onClick={(e) =>
            e.stopPropagation()
          }
        >

          {/* HEADER */}

          <div
            className="
              px-5
              py-3
              border-b
              border-black/10
              dark:border-white/10
              flex
              items-center
              justify-between
              bg-slate-100
              dark:bg-[#121418]
            "
          >

            <div className="flex flex-col">

              <span
                className="
                  text-xs
                  font-voda
                  font-bold
                  text-slate-900
                  dark:text-white
                  uppercase
                  tracking-wider
                "
              >
                Attach Landing Page From Catalogue
              </span>


              <span
                className="
                  text-[9px]
                  text-slate-500
                  dark:text-slate-400
                  mt-0.5
                "
              >
                Choose an existing landing page for this scenario
              </span>

            </div>


            <button
              type="button"
              onClick={onClose}
              className="
                p-1.5
                rounded-lg
                text-slate-500
                hover:text-black
                dark:hover:text-white
                hover:bg-black/5
                dark:hover:bg-white/10
                cursor-pointer
                transition-colors
              "
            >

              <X className="w-4 h-4" />

            </button>

          </div>


          {/* LANDING PAGE GRID */}

          <div
            className="
              flex-1
              overflow-y-auto
              p-4
              grid
              grid-cols-1
              md:grid-cols-2
              lg:grid-cols-3
              gap-3.5
              bg-slate-50
              dark:bg-[#0c0d10]
            "
          >

            {landingPageCatalogue.map((item) => {

              const itemId =
                getItemId(item);

              const itemName =
                getItemName(item);

              const itemContent =
                getItemContent(item);

              const isSelected =
                itemId === selectedLandingPageId;


              return (
                <div
                  key={itemId}
                  className={`
                    relative
                    rounded-xl
                    overflow-hidden
                    border
                    shadow-sm
                    flex
                    flex-col
                    justify-between
                    h-[210px]
                    transition-all
                    bg-white
                    dark:bg-[#1A1C23]

                    ${
                      isSelected
                        ? 'ring-2 ring-[#E60000] border-transparent'
                        : 'border-slate-200 dark:border-white/10'
                    }
                  `}
                >

                  {/* LANDING PAGE PREVIEW */}

                  <div
                    className="
                      absolute
                      inset-0
                      w-full
                      h-full
                      pointer-events-none
                      overflow-hidden
                      z-0
                    "
                  >

                    <iframe
                      title={itemName}
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <meta charset="utf-8"/>
                            <meta
                              name="viewport"
                              content="width=device-width, initial-scale=1"
                            />

                            <style>
                              html,
                              body {
                                margin: 0;
                                padding: 0;
                                width: 100%;
                                height: 100%;
                                overflow: hidden;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                text-align: center;
                                font-family:
                                  'Segoe UI',
                                  Arial,
                                  sans-serif;
                                background: #ffffff;
                              }

                              * {
                                box-sizing: border-box;
                              }
                            </style>
                          </head>

                          <body>
                            ${itemContent}
                          </body>
                        </html>
                      `}
                      className="
                        w-[200%]
                        h-[200%]
                        border-none
                      "
                      style={{
                        transform: 'scale(0.5)',
                        transformOrigin: 'top left',
                      }}
                      sandbox="allow-same-origin"
                    />

                  </div>


                  {/* TOP BADGE */}

                  <div
                    className="
                      relative
                      z-10
                      p-2.5
                      flex
                      items-center
                      justify-between
                    "
                  >

                    <span
                      className="
                        px-2
                        py-0.5
                        rounded
                        text-[10px]
                        font-mono
                        font-bold
                        bg-black
                        text-white
                        dark:bg-white
                        dark:text-black
                        shadow-xs
                      "
                    >
                      {itemId}
                    </span>


                    {isSelected && (

                      <span
                        className="
                          px-2
                          py-0.5
                          rounded
                          text-[8px]
                          font-bold
                          uppercase
                          tracking-wide
                          bg-[#8ED973]
                          text-white
                          shadow-xs
                        "
                      >
                        Selected
                      </span>

                    )}

                  </div>


                  {/* FOOTER */}

                  <div
                    className="
                      relative
                      z-10
                      m-2
                      p-2
                      px-3
                      rounded-lg
                      bg-white/90
                      dark:bg-black/80
                      backdrop-blur-xs
                      border
                      border-black/10
                      dark:border-white/10
                      flex
                      items-center
                      justify-between
                      gap-2
                    "
                  >

                    <div
                      className="
                        flex
                        flex-col
                        min-w-0
                        flex-1
                      "
                    >

                      <span
                        className="
                          text-[11px]
                          font-voda
                          font-bold
                          truncate
                          text-slate-900
                          dark:text-white
                        "
                        title={itemName}
                      >
                        {itemName}
                      </span>


                      <span
                        className="
                          text-[8px]
                          text-slate-500
                          dark:text-slate-400
                          mt-0.5
                        "
                      >
                        Landing Page
                      </span>

                    </div>


                    {/* SELECT */}

                    <button
                      type="button"
                      onClick={() =>
                        onSelect(item)
                      }
                      className="
                        px-2.5
                        py-1
                        rounded-md
                        bg-[#E60000]
                        hover:bg-red-700
                        text-white
                        font-voda
                        font-bold
                        text-[9.5px]
                        uppercase
                        tracking-wide
                        cursor-pointer
                        flex
                        items-center
                        gap-1
                        shadow-xs
                        transition-all
                        hover:scale-[1.02]
                        active:scale-95
                        flex-shrink-0
                      "
                    >

                      <span>
                        {isSelected
                          ? 'Selected'
                          : 'Select'}
                      </span>


                      {!isSelected && (
                        <ChevronRight
                          className="
                            w-3
                            h-3
                            stroke-[2.5]
                          "
                        />
                      )}

                    </button>

                  </div>

                </div>
              );

            })}


            {/* EMPTY */}

            {landingPageCatalogue.length === 0 && (

              <div
                className="
                  col-span-full
                  flex
                  items-center
                  justify-center
                  py-16
                "
              >

                <div className="text-center">

                  <div
                    className="
                      text-sm
                      font-bold
                      text-slate-700
                      dark:text-slate-200
                    "
                  >
                    No Landing Pages Available
                  </div>


                  <div
                    className="
                      text-[10px]
                      text-slate-500
                      dark:text-slate-400
                      mt-1
                    "
                  >
                    Create a new landing page to add it to the catalogue.
                  </div>

                </div>

              </div>

            )}

          </div>

        </div>

      </div>
    );
  };


  /* ============================================================
     COVER IMAGE CLICK
  ============================================================ */

  const handleCoverImageClick = () => {

    coverImageInputRef.current?.click();

  };


  /* ============================================================
     COVER IMAGE CHANGE
  ============================================================ */

  const handleCoverImageChange = (
    event
  ) => {

    const file =
      event.target.files?.[0];


    if (!file) {
      return;
    }


    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
    ];


    if (!allowedTypes.includes(file.type)) {

      alert(
        'Please upload a PNG, JPEG or JPG image.'
      );

      event.target.value = '';

      return;
    }


    if (file.size > 5 * 1024 * 1024) {

      alert(
        'Image size should not exceed 5MB.'
      );

      event.target.value = '';

      return;
    }


    const previewUrl =
      URL.createObjectURL(file);


    setFormData((previous) => ({
      ...previous,

      coverImageSource: 'upload',

      coverImage: file,

      coverImageName: file.name,

      coverImagePreview: previewUrl,
    }));

  };


  /* ============================================================
     LANDING PAGE ATTACHED
  ============================================================ */

  const isLandingPageAttached =
    (
      formData.landingPageSource === 'catalogue' &&
      Boolean(formData.landingPageContent)
    ) ||
    formData.landingPageSource === 'builder' ||
    (
      formData.outcomeSource === 'custom' &&
      Boolean(formData.outcomeRichText)
    );


  return (
    <div className="w-full">

      <div
        className="
          grid
          grid-cols-1
          lg:grid-cols-3
          gap-5
          items-stretch
        "
      >

        {/* ====================================================
            CARD 1
            ATTACH COVER IMAGE
        ==================================================== */}

        <div
          className="
            relative
            flex
            flex-col
            h-full
            min-h-[420px]
          "
        >

          {/* CAPSULE */}

          <div
            style={{
              backgroundColor:
                isDark
                  ? OUTCOME_SECTION_THEMES.coverImage.bgDark
                  : OUTCOME_SECTION_THEMES.coverImage.bgLight,
            }}
            className="
              absolute
              top-0
              left-0
              w-[164px]
              h-[122px]
              p-3.5
              rounded-2xl
              flex
              flex-col
              justify-between
              shadow-xs
              z-20
            "
          >

            <h3
              className={`
                text-[14px]
                -mt-1
                font-voda
                font-bold
                tracking-normal
                leading-tight
                ${
                  isDark
                    ? 'text-white'
                    : 'text-slate-900'
                }
              `}
            >
              Attach
              <br />
              Cover Image
            </h3>


            <p
              className={`
                text-[9.5px]
                font-medium
                leading-tight
                opacity-75
                mt-1
                ${
                  isDark
                    ? 'text-slate-300'
                    : 'text-slate-600'
                }
              `}
            >
              Choose a cover
              <br />
              image for this
              <br />
              scenario
            </p>

          </div>


          {/* ARC */}

          <div
            className="
              absolute
              top-[114px]
              left-[154px]
              w-4
              h-4
              pointer-events-none
              z-20
              overflow-hidden
            "
          >

            <svg
              className="w-4 h-4"
              viewBox="0 0 16 16"
              fill="none"
            >

              <path
                d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z"
                fill={shellBg}
              />

            </svg>

          </div>


          {/* TOP RIGHT */}

          <div
            style={{
              backgroundColor: shellBg,
            }}
            className="
              w-[calc(100%-170px)]
              ml-auto
              h-[129px]
              rounded-t-xl
              px-4
              py-3
              flex
              items-center
              justify-center
              z-10
            "
          >

            <ImageIcon
              className={`
                w-8
                h-8
                ${
                  isDark
                    ? 'text-white/15'
                    : 'text-slate-900/10'
                }
              `}
            />

          </div>


          {/* BOTTOM */}

          <div
            style={{
              backgroundColor: shellBg,
            }}
            className="
              w-full
              flex-1
              rounded-tl-xl
              rounded-b-xl
              p-4
              sm:p-5
              flex
              flex-col
              items-center
              justify-center
              gap-2
              z-10
            "
          >

            {formData.coverImagePreview ? (

              <PreviewCardShell
                onRedo={handleRedoCoverImage}
                footer={formData.coverImageName}
                isDark={isDark}
              >

                <img
                  src={formData.coverImagePreview}
                  alt="Preview"
                  className="
                    w-full
                    h-[150px]
                    object-contain
                    p-2
                  "
                />

              </PreviewCardShell>

            ) : (

              <CoverImageDropzone
                onClick={() =>
                  setIsImageCatalogueOpen(true)
                }
                isDark={isDark}
              />

            )}


            <input
              ref={coverImageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleCoverImageChange}
              className="hidden"
            />

          </div>

        </div>


        {/* ====================================================
            CARD 2
            ATTACH LANDING PAGE
        ==================================================== */}

        <div
          className="
            relative
            flex
            flex-col
            h-full
            min-h-[420px]
          "
        >

          {/* CAPSULE */}

          <div
            style={{
              backgroundColor:
                isDark
                  ? OUTCOME_SECTION_THEMES.landingPage.bgDark
                  : OUTCOME_SECTION_THEMES.landingPage.bgLight,
            }}
            className="
              absolute
              top-0
              left-0
              w-[164px]
              h-[122px]
              p-3.5
              rounded-2xl
              flex
              flex-col
              justify-between
              shadow-xs
              z-20
            "
          >

            <h3
              className={`
                text-[14px]
                -mt-1
                font-voda
                font-bold
                tracking-normal
                leading-tight
                ${
                  isDark
                    ? 'text-white'
                    : 'text-slate-900'
                }
              `}
            >
              Attach
              <br />
              Landing Page
            </h3>


            <p
              className={`
                text-[9.5px]
                font-medium
                leading-tight
                opacity-75
                mt-1
                ${
                  isDark
                    ? 'text-slate-300'
                    : 'text-slate-600'
                }
              `}
            >
              Attach or create a
              <br />
              landing page for
              <br />
              this scenario
            </p>

          </div>


          {/* ARC */}

          <div
            className="
              absolute
              top-[114px]
              left-[154px]
              w-4
              h-4
              pointer-events-none
              z-20
              overflow-hidden
            "
          >

            <svg
              className="w-4 h-4"
              viewBox="0 0 16 16"
              fill="none"
            >

              <path
                d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z"
                fill={shellBg}
              />

            </svg>

          </div>


          {/* TOP RIGHT */}

          <div
            style={{
              backgroundColor: shellBg,
            }}
            className="
              w-[calc(100%-170px)]
              ml-auto
              h-[129px]
              rounded-t-xl
              px-4
              py-3
              flex
              items-center
              justify-center
              z-10
            "
          >

            <Link2
              className={`
                w-8
                h-8
                ${
                  isDark
                    ? 'text-white/15'
                    : 'text-slate-900/10'
                }
              `}
            />

          </div>


          {/* BOTTOM */}

          <div
            style={{
              backgroundColor: shellBg,
            }}
            className="
              w-full
              flex-1
              rounded-tl-xl
              rounded-b-xl
              p-4
              sm:p-5
              flex
              flex-col
              items-center
              justify-center
              gap-1
              z-10
            "
          >

            {formData.landingPageSource === 'catalogue' &&
            formData.landingPageContent ? (

              <LandingPageSelectedPreview
    itemId={
      formData.selectedLandingCatalogueImageId
    }
    itemName={
      formData.coverLandingImageName
    }
    itemContent={
      formData.landingPageContent
    }
    onRedo={
      handleRedoLandingPage
    }
    isDark={isDark}
  />

            ) : formData.landingPageSource === 'builder' ? (

              <PreviewCardShell
    onRedo={handleRedoLandingPage}
    footer={formData.coverLandingImageName}
    isDark={isDark}
  >

    <LandingPageBuilderPreview
      content={formData.landingPageContent}
    />

  </PreviewCardShell>

            ) : formData.outcomeSource === 'custom' &&
              formData.outcomeRichText ? (

              

              <LandingPageSelectedPreview
    
    itemContent={
      formData.outcomeRichText
    }
    onRedo={
      handleRedoLandingPage
    }
    isDark={isDark}
  />

            ) : (

              <>

                <AttachButton
                  label="Choose from Landing Page Catalogue"
                  onClick={() =>
                    setIsLandingPageCatalogueOpen(true)
                  }
                  variant="primary"
                  isDark={isDark}
                />


                <OrDivider
                  isDark={isDark}
                />


                <AttachButton
                  icon={() => (
                    <span className="text-[11px]">
                      ✎
                    </span>
                  )}
                  label="Design a new one"
                  onClick={() =>
                    setIsOutcomeEditorOpen(true)
                  }
                  variant="secondary"
                  isDark={isDark}
                />

              </>

            )}

          </div>

        </div>


        {/* ====================================================
            CARD 3
            ATTACH TRAINING
        ==================================================== */}

        <div
          className="
            relative
            flex
            flex-col
            h-full
            min-h-[420px]
          "
        >

          {/* CAPSULE */}

          <div
            style={{
              backgroundColor:
                isDark
                  ? OUTCOME_SECTION_THEMES.training.bgDark
                  : OUTCOME_SECTION_THEMES.training.bgLight,
            }}
            className="
              absolute
              top-0
              left-0
              w-[164px]
              h-[122px]
              p-3.5
              rounded-2xl
              flex
              flex-col
              justify-between
              shadow-xs
              z-20
            "
          >

            <h3
              className={`
                text-[14px]
                -mt-1
                font-voda
                font-bold
                tracking-normal
                leading-tight
                ${
                  isDark
                    ? 'text-white'
                    : 'text-slate-900'
                }
              `}
            >
              Attach
              <br />
              Training
            </h3>


            <p
              className={`
                text-[9.5px]
                font-medium
                leading-tight
                opacity-75
                mt-1
                ${
                  isDark
                    ? 'text-slate-300'
                    : 'text-slate-600'
                }
              `}
            >
              Attach a training
              <br />
              path for this
              <br />
              scenario
            </p>

          </div>


          {/* ARC */}

          <div
            className="
              absolute
              top-[114px]
              left-[154px]
              w-4
              h-4
              pointer-events-none
              z-20
              overflow-hidden
            "
          >

            <svg
              className="w-4 h-4"
              viewBox="0 0 16 16"
              fill="none"
            >

              <path
                d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z"
                fill={shellBg}
              />

            </svg>

          </div>


          {/* TOP RIGHT */}

          <div
            style={{
              backgroundColor: shellBg,
            }}
            className="
              w-[calc(100%-170px)]
              ml-auto
              h-[129px]
              rounded-t-xl
              px-4
              py-3
              flex
              items-center
              justify-center
              z-10
            "
          >

            <Award
              className={`
                w-8
                h-8
                ${
                  isDark
                    ? 'text-white/15'
                    : 'text-slate-900/10'
                }
              `}
            />

          </div>


          {/* BOTTOM */}

          <div
            style={{
              backgroundColor: shellBg,
            }}
            className="
              w-full
              flex-1
              rounded-tl-xl
              rounded-b-xl
              p-4
              sm:p-5
              flex
              flex-col
              items-center
              justify-center
              gap-2
              z-10
            "
          >

            {/* =================================================
                SELECTED TRAINING
            ================================================= */}

            {formData.trainingSource &&
            formData.selectedTrainingPath ? (

              <SelectedTrainingPreview
                formData={formData}
                onRedo={handleRedoTraining}
              />

            ) : (

              /* =================================================
                 NO TRAINING SELECTED
              ================================================= */

              <AttachButton
                label="Attach Training Path"
                onClick={() =>
                  setIsTrainingPathCatalogueOpen(true)
                }
                variant="primary"
                isDark={isDark}
              />

            )}

          </div>

        </div>

      </div>


      {/* ======================================================
          IMAGE CATALOGUE
      ====================================================== */}

      <ImageCatalogueModal
        isOpen={isImageCatalogueOpen}
        onClose={() =>
          setIsImageCatalogueOpen(false)
        }
        onSelect={handleCatalogueImageSelect}
      />


      {/* ======================================================
          LANDING PAGE CATALOGUE
      ====================================================== */}

      <LandingPageCatalogueModal
        isOpen={isLandingPageCatalogueOpen}
        onClose={() =>
          setIsLandingPageCatalogueOpen(false)
        }
        onSelect={handleLandingPageImageSelect}
        selectedLandingPageId={
          formData.selectedLandingCatalogueImageId
        }
        isDark={isDark}
      />


      {/* ======================================================
          TRAINING PATH CATALOGUE
      ====================================================== */}

      <TrainingPathCatalogueModal
        isOpen={isTrainingPathCatalogueOpen}
        onClose={() =>
          setIsTrainingPathCatalogueOpen(false)
        }
        onSelect={handleTrainingPathSelect}
      />


      {/* ======================================================
          OUTCOME RICH TEXT EDITOR
      ====================================================== */}

      <OutcomeRichTextEditorModal
        isOpen={isOutcomeEditorOpen}
        value={
          formData.outcomeRichText || ''
        }
        onClose={() =>
          setIsOutcomeEditorOpen(false)
        }
        onSave={(value) => {

          setFormData((prev) => ({
            ...prev,

            outcomeSource: 'custom',

            outcomeRichText: value,
          }));


          setIsOutcomeEditorOpen(false);

        }}
      />

    </div>
  );
};


export default AttachOutcomesTab;