import { React, useState, useEffect } from 'react'
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Input from '@material-ui/core/Input';
import FormControl from '@material-ui/core/FormControl';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import Alert from '@material-ui/lab/Alert';
import { Accordion, AccordionDetails, AccordionSummary, Button, CircularProgress, Container, Divider, Grid } from '@material-ui/core';
import PropTypes from 'prop-types';
import LinearProgress from '@material-ui/core/LinearProgress';
import Box from '@material-ui/core/Box';
import StarBorderIcon from '@material-ui/icons/StarBorder';
import { ExpandMoreOutlined } from '@material-ui/icons';
import './App.css'
import './index.css'

function LinearProgressWithLabel(props) {
    return (
        <Box display="flex" alignItems="center">
            <Box width="100%" mr={1}>
                <LinearProgress variant="determinate" {...props} />
            </Box>
            <Box minWidth={35}>
                <Typography variant="body2" color="textSecondary">{`${Math.round(
                    props.value,
                )}%`}</Typography>
            </Box>
        </Box>
    );
}

LinearProgressWithLabel.propTypes = {
    /**
     * The value of the progress indicator for the determinate and buffer variants.
     * Value between 0 and 100.
     */
    value: PropTypes.number.isRequired,
};


const useStyles = makeStyles({
    form: {
        display: 'flex',
        margin: '1em',
        maxWidth: 500,
        justifyContent: 'center',
    },
    marg: {
        margin: '10px',
    }
});

function App() {
    const [error, setError] = useState(null);
    const [errorText, setErrorText] = useState();
    const [isLoaded, setIsLoaded] = useState(false);
    const [username, setUsername] = useState();
    const [mappedProblem, setMapped] = useState({});
    const [medianAc, setMedian] = useState();
    const [allProblems, setAllProblems] = useState();
    const [tossedProblems, setTossedProblems] = useState();
    const [toughPercent, setToughPercent] = useState(120);
    const [btnDisabled, setBtnDisabled] = useState(true);
    const [yourMedian, setYourMedian] = useState();

    let userSubm, solved = {};
    const classes = useStyles();

    // Note: the empty deps array [] means
    // this useEffect will run once
    // similar to componentDidMount()
    useEffect(() => {
        fetch("https://codeforces.com/api/problemset.problems?&lang=en")
            .then(res => res.json())
            .then(
                (result) => {
                    setIsLoaded(true);
                    let ress = result['result']['problems'];

                    result['result']['problemStatistics'].map((val, key) => {
                        Object.assign(ress[key], val);
                    });

                    let mp = {};

                    for (let i = 0; i < ress.length; i++) {
                        mp[ress[i].contestId.toString() + '/' + ress[i].index] = ress[i].rating
                    }

                    setMapped(mp);

                    ress.sort((a, b) => a.rating - b.rating);
                    ress.reverse();

                    setAllProblems(ress);
                    setBtnDisabled(false);
                },
                // Note: it's important to handle errors here
                // instead of a catch() block so that we don't swallow
                // exceptions from actual bugs in components.
                (error) => {
                    setIsLoaded(true);
                    setErrorText("Something went wrong! Please reload the page again.")
                    setError(error);
                }
            )
    }, [])

    useEffect(() => {
        setTossedProblems(tossedProblems);
        // console.log('Rendering', tossedProblems);
    }, [tossedProblems]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        setTossedProblems(null);
        setError(null);
        setIsLoaded(false);

        let er = false;

        if (!username) {
            setErrorText("Username Field can't be empty!")
            setError(error);
            setIsLoaded(true);
            return;
        }

        await fetch(`https://codeforces.com/api/user.status?handle=${username}&lang=en`)
            .then(res => res.json())
            .then((result) => {
                console.log(result);
                if (result['status'] == 'FAILED') {
                    setErrorText(result['comment']);
                    setError(true);
                    er = true;
                    setIsLoaded(true);
                    return;
                }
                else {
                    userSubm = result['result'];
                    console.log('success');
                }
            })
            .catch(e => {
                setErrorText("Something went wrong.")
                setError(error);
                return;
            });

        if (er) return;

        let median = calcMedian();
        toss(median);
        setIsLoaded(true);
    }

    const calcMedian = () => {
        let tempSubm = [];
        userSubm.forEach(item => {
            if (item.problem.contestId && item.problem.index && item.verdict === 'OK') {
                let inx = item.problem.contestId.toString() + '/' + item.problem.index;
                if (mappedProblem[inx]) {
                    tempSubm.push(mappedProblem[inx]);
                    solved[inx] = true;
                }
            }
        });

        tempSubm.sort((a, b) => a - b);

        let median = tempSubm[Math.round((tempSubm.length + 1) / 2)];
        setYourMedian(median);
        median *= (toughPercent) / 100;
        setMedian(median);

        return median;
    }

    const getDidntSolve = (median) => {
        let tempMapped = {};

        allProblems.forEach(item => {
            let inx = item.contestId.toString() + '/' + item.index;

            let url = 'https://codeforces.com/problemset/problem/';
            url += inx;

            if (!item.tags.includes('*special'))
                if (!solved[inx] && mappedProblem[inx] > median) {
                    Object.assign(item, { 'url': url });
                    tempMapped[inx] = item;
                }
        });

        return tempMapped;
    }

    const toss = (median) => {
        let data = getDidntSolve(median);

        let tossed = [];

        for (var key in data) {
            let regx = /[A-Za-z]/g;
            if (key.match(regx)) {
                tossed.push(data[key]);
            }
        }

        tossed.sort((a, b) => a.rating - b.rating);

        let tossedSorted = tossed.slice(0, 20);

        tossedSorted.sort((a, b) => b.solvedCount - a.solvedCount);

        setTossedProblems(tossedSorted);

        if (tossedSorted.length == 0) {
            console.log('here');
            setErrorText('Difficulty level too high. Codeforces doesn\'t contain this much difficult problem yet');
            setError(true);
        }
    }

    const revealTags = (event, index) => {
        let tags = tossedProblems[index]['tags'].map(item => item);
        let lev = event.target.parentElement;

        if (lev.nodeName.toLowerCase() == 'td') {
            lev.innerHTML = tags;
        }
        else {
            lev.parentElement.innerHTML = tags;
        }
    }

    return (
        <Container maxWidth="lg">
            <h1 style={{fontFamily: 'consolas, monospace', paddingLeft:'10px'}}>Last Wish</h1>
            <Paper elevation={1} style={{ marginTop: '2em', lineHeight: '1.5' }}>
                <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMoreOutlined />}
                        aria-controls="panel1a-content"
                        id="panel1a-header"
                    >
                        <Typography>What the hell is this?</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography>
                            Hey there! Welcome to Last Wish! It's a trainer that will help you suggest good problems according to your codeforces profile. You can optionally use the difficulty progress bar to fix <b>uncomfortable</b> problem for you. That's the best practice right?
                            <br /> <br/>
                            Just input your Codeforces handle and <b>Toss</b> it to grab some tough problems to solve.
                        </Typography>
                    </AccordionDetails>
                </Accordion>

                {/* <p>What is Median?</p> */}
                {/* <Divider/> */}
                {/* <p>Let's say, you have a list of integers of your solved problems' rating, a=[1, 2, 4, 5, 3]. Now sort this list, a=[1, 2, 3, 4, 5]. The median is = a[(a.length+1)/2] = a[3] = 3.</p> */}
            </Paper>

            <Paper elevation={1} style={{ padding: '1em', marginBottom: '10px', marginTop: '1em' }}>
                <FormControl onSubmit={handleSubmit} className={classes.form}>
                    <Input
                        id="input-with-icon-adornment"
                        placeholder="Codeforces Handle"
                        onChange={e => setUsername(e.target.value)}
                        value={username}
                        style={{ marginBottom: '2em' }}
                    />

                    <Typography style={{ marginTop: '0em' }} id="discrete-slider" gutterBottom>
                        Difficulty Level
                    </Typography>
                    <Slider
                        defaultValue={40}
                        getAriaValueText={(value => {
                            setToughPercent(value + 100);
                            return value;
                        })}
                        aria-labelledby="input-slider"
                        valueLabelDisplay="auto"
                        step={1}
                        // marks
                        min={0}
                        max={100}
                    />
                </FormControl>

                <Button disabled={btnDisabled} style={{ marginLeft: '1em', marginBottom: '2em' }} type="submit" variant="contained" onClick={handleSubmit}>Toss</Button>

                <Divider />

                {yourMedian && <Grid container spacing={1} style={{ padding: '1em' }}><Grid item='xs' style={{ paddingTop: '6px' }}><StarBorderIcon /></Grid><Grid item="xs" style={{ paddingTop: '10px' }}>Your current Median Rating is {yourMedian}</Grid></Grid>}

            </Paper>

            {!isLoaded && <CircularProgress style={{ textAlign: 'center', padding: '1em', justifyContent: 'center' }} />}
            {error && <Alert severity="error">{errorText}</Alert>}
            {
                tossedProblems &&
                <TableContainer component={Paper} style={{ marginBottom: '2em' }}>
                    <Typography style={{ padding: '1em' }} variant="h6" id="tableTitle" component="div">
                        Suggested Problems
                </Typography>
                    <Table stickyHeader aria-label="sticky table">
                        <caption>Showing problems more than {medianAc} rating</caption>
                        <TableHead>
                            <TableRow>
                                <TableCell align='center'>Contest</TableCell>
                                <TableCell align="left">Name</TableCell>
                                <TableCell align="left">Solved by</TableCell>
                                <TableCell align="left">Tags</TableCell>
                                <TableCell align="left">Timer</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {
                                tossedProblems.map((item, inx) => (
                                    <TableRow
                                        key={item.url}
                                        hover
                                    >
                                        <TableCell align="center">
                                            <b>{item.contestId}{item.index}</b>
                                        </TableCell>
                                        <TableCell align="left">
                                            <a target='__blank' href={item.url}>{item.name}</a>
                                        </TableCell>

                                        <TableCell align="left">
                                            {item.solvedCount}
                                        </TableCell>

                                        <TableCell align="left">
                                            <Button onClick={(e) => revealTags(e, inx)}>Show Tags</Button>
                                        </TableCell>

                                        <TableCell align="left">
                                            <Button>Start Timer</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            }
                        </TableBody>
                    </Table>
                </TableContainer>
            }
        </Container>
    );
}


export default App;
