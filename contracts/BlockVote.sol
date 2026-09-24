// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract BlockVote {

    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    struct Voter {
        bool registered;
        bool hasVoted;
    }

    address public admin;

string public electionName;

bool public electionStarted;
bool public electionEnded;

uint256 public candidateCount;
uint256 public totalVotes;

    mapping(uint256 => Candidate) public candidates;
    mapping(address => Voter) public voters;

    event CandidateAdded(
        uint256 indexed candidateId,
        string name
    );

    event VoterRegistered(
        address indexed voter
    );

    event ElectionStarted();

    event ElectionEnded();

    event VoteCast(
        address indexed voter,
        uint256 indexed candidateId
    );

    modifier onlyAdmin() {
        require(
            msg.sender == admin,
            "Only admin can perform this action"
        );
        _;
    }

    constructor(
    string memory _electionName
) {
    admin = msg.sender;
    electionName = _electionName;
}

    function addCandidate(
        string memory name
    ) public onlyAdmin {

        require(
            !electionStarted,
            "Election already started"
        );

        require(
            bytes(name).length > 0,
            "Candidate name cannot be empty"
        );

        candidateCount++;

        candidates[candidateCount] = Candidate({
            id: candidateCount,
            name: name,
            voteCount: 0
        });

        emit CandidateAdded(
            candidateCount,
            name
        );
    }

    function registerVoter(
        address voter
    ) public onlyAdmin {

        require(
            !electionStarted,
            "Election already started"
        );

        require(
            voter != address(0),
            "Invalid voter address"
        );

        require(
            !voters[voter].registered,
            "Voter already registered"
        );

        voters[voter] = Voter({
            registered: true,
            hasVoted: false
        });

        emit VoterRegistered(voter);
    }

    function startElection() public onlyAdmin {

        require(
            !electionStarted,
            "Election already started"
        );

        require(
            !electionEnded,
            "Election has already ended"
        );

        require(
            candidateCount > 0,
            "Add candidates first"
        );

        electionStarted = true;

        emit ElectionStarted();
    }

    function vote(
        uint256 candidateId
    ) public {

        require(
            electionStarted,
            "Election has not started"
        );

        require(
            !electionEnded,
            "Election has ended"
        );

        require(
            voters[msg.sender].registered,
            "You are not a registered voter"
        );

        require(
            !voters[msg.sender].hasVoted,
            "You have already voted"
        );

        require(
            candidateId > 0 &&
            candidateId <= candidateCount,
            "Invalid candidate"
        );

        candidates[candidateId].voteCount++;

voters[msg.sender].hasVoted = true;

totalVotes++;

        emit VoteCast(
            msg.sender,
            candidateId
        );
    }

    function endElection() public onlyAdmin {

        require(
            electionStarted,
            "Election has not started"
        );

        require(
            !electionEnded,
            "Election already ended"
        );

        electionEnded = true;

        emit ElectionEnded();
    }

    function getCandidate(
        uint256 candidateId
    )
        public
        view
        returns (
            uint256 id,
            string memory name,
            uint256 voteCount
        )
    {
        Candidate memory candidate =
            candidates[candidateId];

        return (
            candidate.id,
            candidate.name,
            candidate.voteCount
        );
    }

    function getVoterStatus(
        address voter
    )
        public
        view
        returns (
            bool registered,
            bool hasVoted
        )
    {
        Voter memory voterData = voters[voter];

        return (
            voterData.registered,
            voterData.hasVoted
        );
    }
}