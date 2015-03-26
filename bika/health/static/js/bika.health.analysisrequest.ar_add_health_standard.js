/**
 * Controller class for AnalysisRequest add view for health standard
 */
function HealthStandardAnalysisRequestAddView() {
    /**
     * Correct functionality:
     * ======================
     *
     * AR coming from batch:
     * ---------------------
     *  - Patient -> From batch. Fields blocked.
     *  - Guarantor and insurance -> From batch's patient. Fields blocked.
     *  - The save button is going to crate -> an AR
     *
     * AR coming from patient:
     * -----------------------
     *  - Patient -> From patient. Fields blocked.
     *  - Guarantor and insurance -> From the current patient. Fields blocked
     *  - The save button is going to crate -> a case, an AR
     *
     * AR coming from client:
     * ----------------------
     *  - Patient -> Must be chosen first!
     *  -- If a new patient is being created (NewPatientCheckbox == selected) ->
     *                                                 - Guarantor's + insurance ready to be edited. Fields unblocked.
     *                                                 - Patient fields unblocked.
     *  --- The save button is going to create -> a patient, a case, an AR
     *
     *  -- If an old patient is selected (NewPatientCheckbox == unselected) ->
     *                                                 - Guarantor + insurance from selected patient. Fields blocked.
     *                                                 - Patient fields blocked.
     *  --- The save button is going to create -> a case, an AR
     */

    var that = this;

    // ------------------------------------------------------------------------
    // PUBLIC FUNCTIONS
    // ------------------------------------------------------------------------

    /**
     * Entry-point method for StandardAnalysisRequestAddView
     */
    this.load = function () {
        var datafilled = false;
        var frombatch = window.location.href.search('/batches/') >= 0;
        var frompatient = document.referrer.search('/patients/') >= 0;

        if (frombatch) {
            // The current AR add View comes from a batch. Automatically fill
            // the Client, Patient and Doctor fields and set them as readonly.
            // Deactivate the option and fields to create a new patient
            datafilled = true;
            var batchid = window.location.href.split("/batches/")[1].split("/")[0];
            cancelPatientCreation(batchid);
            // The fields with data should be fill out and set them as readonly.
            setDataFromBatch(batchid);
        }
        else if (frompatient) {
            // The current AR add View comes from a patient AR folder view.
            // Automatically fill the Client and Patient fields and set them
            // as readonly.
            datafilled = true;
            cancelPatientCreation();
            setDataFromPatient()
        }

        if (!datafilled) {
            // The current AR Add View doesn't come from a batch nor patient .
            // Handle event firing when Patient or ClientPatientID fields change.

            // ClientPatientID changed
            $('[id$="_ClientPatientID"]').bind("selected paste blur change", function () {
               // Load the new patients data
                $('input[id$="_Patient"]').trigger("change");
            });

            // PatientFullName changed
            $('[id$="_Patient"]').bind("selected paste blur change", function () {
                // Set the new patient data
                var patientUID = $(this).attr('uid');
                setPatientData(patientUID);
                // Set the new insurance's patient. We can call the function used to fill the insurance data when the
                // AR comes from a batch
                setInsuranceDataFromBatch(patientUID);
            });

            // NewPatient checkbox change
            var np = $('input#NewPatient');
            np.bind("click change", function () {
                // The old patient's data should be uploaded/cleaned
                hideShowFirstnameSurname();
                if (np.prop('checked')) {
                    // If we are creating a new patient we should allow to fill the insurance stuff
                    cleanAndEnableDisableInsuranceData(false);
                }
                else{
                    cleanAndEnableDisableInsuranceData(true);
                }
            });
        }

        // Binding the triggers used on all cases
        $('[id$="_Doctor"]').bind("selected paste blur change", function () {
            setDoctorCode();
        });
        $('input#PatientAsGuarantor').bind("selected paste blur change", function() {

        });

        // Functions to execute at page load
        hideShowFirstnameSurname();
        disableInsuranceData();
    };
    // ------------------------------------------------------------------------
    // PRIVATE FUNCTIONS
    // ------------------------------------------------------------------------

    function setDataFromBatch(batchid){
        /**
         * It obtains the patient data when the AR comes from the batch (case) view.
         */
        $.ajaxSetup({async:false});
        // Get batch data
        window.bika.lims.jsonapi_read({
            catalog_name:'bika_catalog',
            id:batchid
        }, function(data){
            // Set patient data
            setPatientData(data.objects[0]['getPatientUID']);
            // Set the doctor's code
            $('input#DoctorsCode').val(data.objects[0]['getDoctorID']).prop('disabled', true);
            // Set the insurance company and block the insurance fields if it's necessary
            setInsuranceDataFromBatch(data.objects[0]['getPatientUID']);
        });
        $.ajaxSetup({async:true});
    }

    function setDataFromPatient(){
        /**
         * It obtains the patient data when the AR comes from the patient view.
         */
        var pid = document.referrer.split("/patients/")[1].split("/")[0];
        $.ajaxSetup({async:false});
        // Get patient data
        window.bika.lims.jsonapi_read({
            catalog_name:'bika_patient_catalog',
            id:pid
        }, function(data){
            setPatientData(data.objects[0]);
            setInsuranceDataFromPatient(data.objects[0])
        });
        $.ajaxSetup({async:true});
    }

    // Patient template JS ----------------------------------------------------
    function cancelPatientCreation() {
        /**
         * If the "create a new patient" actions should be canceled, this function hides the specific fields to create
         * a new patient and deactivates the possibility of interact with the checkbox.
         */
        var cb = $('input#NewPatient');
        cb.prop('checked', false);
        // Prevent to be checked
        cb.on('click', function(e){
                e.preventDefault();
                return false;
        });
        cb.hide();
    }

    function cleanPatientData(){
        /**
         * Clean all fields used by patient
         */
        $('[id$="_Patient"]').val('').attr('uid','');
        $('input#Surname').val('');
        $('input#Firstname').val('');
        $("input#BirthDate").val('');
        $('input#BirthDateEstimated').prop('checked', false);
        $('select#Gender').val('dk');
        $('input#BusinessPhone').val('').attr('uid','');
        $('input#HomePhone').val('');
        $('input#MobilePhone').val('');
        $('input#EmailAddress').val('');
        $('input#ar_0_ClientPatientID').val('').attr('uid','');
    }
    function hideShowFirstnameSurname(){
        /**
         * Hide/show the fields surname, first name and patient depending on the checkbox state. This function clear
         * all patient data too.
         */
        var cb = $('input#NewPatient');
        if (cb.prop('checked')) {
            $('div#archetypes-fieldname-Patient').hide();
            $('div#archetypes-fieldname-Surname').show();
            $('div#archetypes-fieldname-Firstname').show();

            // Enable and clear all the fields
            $('input#Surname').prop('disabled', false);
            $('input#Firstname').prop('disabled', false);
            $("input#BirthDate").prop('disabled', false);
            $('input#BirthDateEstimated').prop('disabled', false).prop('checked', false);
            $('select#Gender').prop('disabled', false).val('dk');
            $('input#BusinessPhone').prop('disabled', false);
            $('input#HomePhone').prop('disabled', false);
            $('input#MobilePhone').prop('disabled', false);
            $('input#EmailAddress').prop('disabled', false);
            // We should clean the old data
            cleanPatientData()
        }
        else {

            $('div#archetypes-fieldname-Patient').show();
            $('div#archetypes-fieldname-Surname').hide();
            $('div#archetypes-fieldname-Firstname').hide();

            // Disable and clear all the fields
            $("input#BirthDate").prop('disabled', true);
            $('input#BirthDateEstimated').prop('disabled', true);
            $('select#Gender').prop('disabled', true);
            $('input#BusinessPhone').prop('disabled', true);
            $('input#HomePhone').prop('disabled', true);
            $('input#MobilePhone').prop('disabled', true);
            $('input#EmailAddress').prop('disabled', true);
            //cleanPatientData()
        }
    }

    function setPatientData(patientuid){
        /**
         * It fill out the patient data that remains from the bika.analysisrequest.add.js and blocks it.
         * @patientuid The patientuid
         */
        if (patientuid == ''){
            // All data patient should be cleaned
            cleanPatientData()
        }
        $.ajaxSetup({async:false});
        window.bika.lims.jsonapi_read({
            catalog_name: 'bika_patient_catalog',
            UID: patientuid
        },function(dataobj){
            if (dataobj.objects.length > 0) {
                var data = dataobj.objects[0];
                //$(".dynamic-field-label").remove();
                $("input#BirthDate").val(data['BirthDate']).prop('disabled', true);
                $('input#BirthDateEstimated').prop('checked', data['BirthDateEstimated']).prop('disabled', true);
                $('select#Gender').val(data['Gender']).prop('disabled', true);
                $('input#BusinessPhone').val(data['BusinessPhone']).prop('disabled', true);
                $('input#HomePhone').val(data['HomePhone']).prop('disabled', true);
                $('input#MobilePhone').val(data['MobilePhone']).prop('disabled', true);
                $('input#EmailAddress').val(data['EmailAddress']).prop('disabled', true);
            }
        });
        $.ajaxSetup({async:false});
    }

    // Doctor's template JS ------------------------------------------------

    function setDoctorCode(){
        /**
         * Set the Doctor's code from the selected Referring Doctor.
         */
        var doctoruid = $('[id$="_Doctor"]').attr('uid');
        $.ajaxSetup({async:false});
        window.bika.lims.jsonapi_read({
            catalog_name:'portal_catalog',
            portal_type: 'Doctor',
            UID:doctoruid
        }, function(data){
            $('input#DoctorsCode').val(data.objects[0]['DoctorID']);
        });
        $.ajaxSetup({async:false});
    }

    // Insurance's template JS --------------------------------------------------

    function setInsuranceDataFromBatch(patientuid){
        /**
         * The function checks if the patient is related with an insurance company. In the affirmative case,
         * the insurance fields will be filled out and blocked
         * @patientuid The patient uid where the function will look for the insurance company.
         */
        if (patientuid == ''){
            // It means that the patient fields have been cleaned of data.
            cleanAndEnableDisableInsuranceData(false);
        }
        else {
            $.ajaxSetup({async: false});
            window.bika.lims.jsonapi_read({
                catalog_name: 'bika_patient_catalog',
                UID: patientuid
            }, function (data) {
                if (data.objects[0]['InsuranceCompany_uid'] != '') {
                    setInsurance(data.objects[0]['InsuranceCompany_uid']);
                }
                // Since data variable stores the patient fields, we can set all guarantor stuff.
                setGuarantor(data.objects[0]);
            });
            $.ajaxSetup({async: false});
        }
    }

    function disableInsuranceData(){
        /**
         * Disable all the fields related with the insurance
         */
        $('input#ar_0_InsuranceCompany').prop('disabled', true);
        $('input#PatientAsGuarantor').prop('disabled', true);
        $('input#GuarantorID').prop('disabled', true);
        $('input#GuarantorSurname').prop('disabled', true);
        $('input#GuarantorFirstname').prop('disabled', true);
        $('select[id="PostalAddress.country"]').prop('disabled', true);
        $('select[id="PostalAddress.state"]').prop('disabled', true);
        $('select[id="PostalAddress.district"]').prop('disabled', true);
        $('input[id="PostalAddress.city"]').prop('disabled', true);
        $('input[id="PostalAddress.zip"]').prop('disabled', true);
        $('textarea[id="PostalAddress.address"]').prop('disabled', true);
        $('input#GuarantorBusinessPhone').prop('disabled', true);
        $('input#GuarantorHomePhone').prop('disabled', true);
        $('input#GuarantorMobilePhone').prop('disabled', true);
    }

    function cleanAndEnableDisableInsuranceData(state){
        /**
         * Clean and enable/disable all the fields related with the insurance
         * @state True/False depending on the disable state
         */
        $('input#ar_0_InsuranceCompany').val('').attr('uid','').prop('disabled', state);
        $('input#PatientAsGuarantor').prop('checked', false).prop('disabled', state);
        $('input#GuarantorID').val('').prop('disabled', state);
        $('input#GuarantorSurname').val('').prop('disabled', state);
        $('input#GuarantorFirstname').val('').prop('disabled', state);
        $('select[id="PostalAddress.country"]')
            .val($('[id="PostalAddress.country"] option[selected="selected"]').val()).prop('disabled', state);
        $('select[id="PostalAddress.state"]').val('').prop('disabled', state);
        $('select[id="PostalAddress.district"]').val('').prop('disabled', state);
        $('input[id="PostalAddress.city"]').val('').prop('disabled', state);
        $('input[id="PostalAddress.zip"]').val('').prop('disabled', state);
        $('textarea[id="PostalAddress.address"]').val('').prop('disabled', state);
        $('input#GuarantorBusinessPhone').val('').prop('disabled', state);
        $('input#GuarantorHomePhone').val('').prop('disabled', state);
        $('input#GuarantorMobilePhone').val('').prop('disabled', state);
    }

    function setInsuranceDataFromPatient(patientdata){
        /**
         * The function checks if the patient is related with an insurance company. In the affirmative case,
         * the insurance fields will be filled out and blocked
         * @patientuid The patient uid where the function will look for the insurance company.
         */
        // Check if patient is related with an insurance company
        if (patientdata['InsuranceCompany_uid'] != ''){
            setInsurance(patientdata['InsuranceCompany_uid']);
        }
        // Fill out guarantor's fields
        setGuarantor(patientdata);
    }

    function setInsurance(insuranceuid){
        /**
         * This function fill out the insurance field and block it.
         * @insuranceuid The insurance company UID
         */
        if (insuranceuid != undefined) {
            $.ajaxSetup({async: false});
            window.bika.lims.jsonapi_read({
                catalog_name: 'bika_setup_catalog',
                content_type: 'InsuranceCompany',
                UID: insuranceuid
            }, function (dataobj) {
                var data = dataobj.objects[0];
                $('input#ar_0_InsuranceCompany').val(data['Title']).attr('uid', data['UID']).prop('disabled', true);
            });
            $.ajaxSetup({async: false});
        }
    }

    function setGuarantor(patientdata) {
        /**
         * Fill out all guarantor's fields.
         * @patientdata It's a dictionary with tha patient's data
         */
        // The AR comes from batch or patients view
        $('input#PatientAsGuarantor').prop('checked', patientdata['PatientAsGuarantor']).prop('disabled', true);
        $('input#GuarantorID').val(patientdata['GuarantorID']).prop('disabled', true);
        $('input#GuarantorSurname').val(patientdata['GuarantorSurname']).prop('disabled', true);
        $('input#GuarantorFirstname').val(patientdata['GuarantorFirstname']).prop('disabled', true);
        $('select[id="PostalAddress.country"]').val(patientdata['PostalAddress']['country']).prop('disabled', true);
        $('select[id="PostalAddress.state"]').val(patientdata['PostalAddress']['state']).prop('disabled', true);
        $('select[id="PostalAddress.district"]').val(patientdata['PostalAddress']['district']).prop('disabled', true);
        $('input[id="PostalAddress.city"]').val(patientdata['PostalAddress']['city']).prop('disabled', true);
        $('input[id="PostalAddress.zip"]').val(patientdata['PostalAddress']['zip']).prop('disabled', true);
        $('textarea[id="PostalAddress.address"]').val(patientdata['PostalAddress']['address']).prop('disabled', true);
        $('input#GuarantorBusinessPhone').val(patientdata['GuarantorBusinessPhone']).prop('disabled', true);
        $('input#GuarantorHomePhone').val(patientdata['GuarantorHomePhone']).prop('disabled', true);
        $('input#GuarantorMobilePhone').val(patientdata['GuarantorMobilePhone']).prop('disabled', true);
    }

}
