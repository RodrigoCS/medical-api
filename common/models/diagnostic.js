'use strict'
const _ = require('lodash')
const Promise = require('bluebird')

const app = require('../../server/server')
const DiagnosticSign = app.models.DiagnosticSign
const DiagnosticSymptom = app.models.DiagnosticSymptom
module.exports = function(Diagnostic) {
  /**
   *
   * @param {array} signs
   * @param {array} symptoms
   * @param {Function(Error)} callback
   */

  Diagnostic.getMedicalDiagnostic = async function(signs, symptoms, callback) {
    try {
      let filter = { include: ['signs', 'symptoms'] }
      let diagnostics = await Diagnostic.find(filter)
      let length = diagnostics.length
      let possible = []
      // FIRST EXPERT FASE
      await Promise.map(diagnostics, (diagnostic, index) => {
        diagnostic = diagnostic.__data
        let diagnosticSigns = diagnostic.signs.map(si => si.id.toString())
        let diagnosticSymptoms = diagnostic.symptoms.map(sy => sy.id.toString())

        console.log({ signs, diagnosticSigns, symptoms, diagnosticSymptoms })

        let foundSigns = _.intersection(diagnosticSigns, signs).length
        let foundSymptoms = _.intersection(diagnosticSymptoms, symptoms).length
        console.log({ foundSigns, foundSymptoms })

        if (foundSigns > 0 || foundSymptoms > 0) {
          possible = [
            ...possible,
            {
              ...diagnostic,
              points:
                (foundSigns + foundSymptoms) /
                (diagnosticSigns.length + diagnosticSymptoms.length)
            }
          ]
        }
        return diagnostic
      })

      if (possible.length === 0) {
        let unkownDiagnostic = await Diagnostic.create({
          disease: 'Unknown'
        })
        signs.map(si => {
          app.models.DiagnosticSign.create({
            signId: si,
            diagnosticId: unkownDiagnostic.id
          })
        })
        symptoms.map(sy => {
          app.models.DiagnosticSymptom.create({
            symptomId: sy,
            diagnosticId: unkownDiagnostic.id
          })
        })
      }

      possible = _.orderBy(possible, 'points', 'desc')

      callback(null, possible)
    } catch (error) {
      callback(error)
    }
  }
}
