let dzClientAttachments = null;

function doDZClientAttachments()
{
  if (dzClientAttachments)
    return;

  dzClientAttachments = new Dropzone
  (
    '#div_Attachments',
    {
      url: '/dropclientattachment',
      clickable: '.tbClientAttachments_uploadFile',
      uploadMultiple: false,
      parallelUploads: 1,
      addRemoveLinks: true,
      previewTemplate : '<div style="display:none"></div>',
      maxFilesize: 10,
      createImageThumbnails: false,
      dictDefaultMessage: "",
      init: function()
      {
        this.on
        (
          'error',
          (file, errMsg, xhr) => {
            noty({text: 'Error :' + errMsg , type: 'error', timeout: 5000});
          }
        ),
        this.on
        (
          'sending',
          function(file, xhr, formData)
          {
            formData.append('clientid', selectedClientIdAttachmentId);
            formData.append('uuid', uuid);
            formData.append('parentid', attachment_parentid);
          }
        ),
        this.on
        (
          'success',
          function(file, res)
          {
            doServerDataMessage('listclientattachments', {clientid: selectedClientIdAttachmentId}, {type: 'refresh'});
            this.removeFile(file);
            
          }
        ),
        this.on
        (
          'reset',
          function(file, xhr, formData)
          {
          }
        );
      },
      accept: function(file, done)
      {
        done();
      }
    }
  );
}
