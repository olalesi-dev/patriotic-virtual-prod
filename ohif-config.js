// OHIF Viewer — Patriotic Virtual Telehealth PACS
// This connects the OHIF web viewer to Orthanc's DICOMweb endpoints
window.config = {
  routerBasename: "/",
  showStudyList: true,
  extensions: [],
  modes: [],
  customizationService: {},
  dataSources: [
    {
      namespace: "@ohif/extension-default.dataSourcesModule.dicomweb",
      sourceName: "PVT-PACS",
      configuration: {
        friendlyName: "Patriotic Virtual PACS",
        name: "orthanc",
        wadoUriRoot: "http://136.111.99.153/wado",
        qidoRoot: "http://136.111.99.153/dicom-web",
        wadoRoot: "http://136.111.99.153/dicom-web",
        qidoSupportsIncludeField: false,
        imageRendering: "wadors",
        thumbnailRendering: "wadors",
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: false,
        supportsWildcard: true,
        bulkDataURI: {
          enabled: true,
        },
      },
    },
  ],
  defaultDataSourceName: "PVT-PACS",
};
