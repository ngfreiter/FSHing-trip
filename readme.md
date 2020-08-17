# Fishing Trip

The `fishingTrip.js` script provides a simple wrapper that takes as input a set of FHIR StructureDefinitions. Those SDs are converted to FSH using goFSH, and then converted back to FHIR SDs using [SUSHI](https://fshschool.org/docs/sushi). The resulting "round-trip" output is compared to the original input to generate a differential that shows how well goFSH and SUSHI have replicated the original input.

To use this tool, first, ensure that you have goFSH and SUSHI globally installed with npm. Then, clone this repo:
```
git clone https://github.com/ngfreiter/fishing-trip.git
```
and run `npm install` to install required dependencies:
```
cd fishing-trip
npm install
```
Then you can run the wrapper script by doing:
```
node fishingTrip.js <path-to-defs>
```
where `<path-to-defs>` is a path to a folder containing JSON FHIR StructureDefinitions, and a `config.yaml` file. The `config.yaml` file is necessary for running SUSHI, and is described in detail by the [SUSHI documentation](https://fshschool.org/docs/sushi/configuration/). Any required dependencies should be listed in the `config.yaml` file.

The output will by default be written to a `build` folder within the current working directory. Alternatively, an output folder can optionally be specified:
```
node fishingTrip.js <path-to-defs> <optional-path-to-output>
```
Within the output folder will be a `goFSH` folder, containing the output of goFSH, a `sushi` folder, containing the output of sushi, and a `diff` folder, containing HTML files which show the difference between ElementDefinitions on the original input and the round-trip output. Note that the differential generation only works for StructureDefinitions.
